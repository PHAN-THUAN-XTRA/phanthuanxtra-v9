import test from 'node:test';
import assert from 'node:assert/strict';
import { handleAiChat } from '../src/ai-chat.js';

function mockDb(cars = []) {
  const rows = [];
  const unknown = [];
  return {
    prepare(sql) {
      return {
        bind(...args) {
          return {
            async run() {
              if (sql.includes('INSERT INTO ai_conversations')) rows.push({type:'conversation',id:args[0]});
              if (sql.includes('INSERT INTO ai_messages')) rows.push({type:'message',role:args[1],content:args[2]});
              if (sql.includes('INSERT INTO ai_unknown_questions')) unknown.push({id:unknown.length+1,conversation_id:args[0],question:args[1],name:args[2],phone:args[3],status:'pending'});
            },
            async all() {
              if (sql.includes('FROM ai_messages')) return {results: rows.filter(x=>x.type==='message').slice(-12).map(x=>({role:x.role,content:x.content}))};
              if (sql.includes("FROM cars WHERE status <> 'hidden'")) return {results: cars.filter(x=>x.status !== 'hidden')};
              return {results:[]};
            },
            async first() {
              if (sql.includes('FROM ai_unknown_questions')) return unknown.filter(x=>x.status==='pending').at(-1) || null;
              return null;
            }
          };
        }
      };
    },
    _rows: rows,
    _unknown: unknown
  };
}

test('website AI chat creates a conversation, calls AI and persists reply', async () => {
  const DB = mockDb();
  const env = {
    DB,
    AI_SEARCH: { async search() { return { chunks: [] }; } },
    AI: { async run(model, payload) {
      assert.equal(model, '@cf/meta/llama-3.2-3b-instruct');
      assert.equal(payload.messages.at(-1).content, 'Tôi muốn tìm Lexus');
      return { response: 'Tôi có thể hỗ trợ anh tìm Lexus phù hợp.' };
    } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({conversation_id:'test-conversation',visitor_id:'test-visitor',message:'Tôi muốn tìm Lexus'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.conversation_id, 'test-conversation');
  assert.match(data.reply, /Lexus/);
  assert.equal(data.needs_human, false);
  assert.ok(DB._rows.some(x=>x.type==='message' && x.role==='user'));
  assert.ok(DB._rows.some(x=>x.type==='message' && x.role==='assistant'));
});

test('Phan Thuần identity knowledge is present when AI Search is unavailable', async () => {
  const DB = mockDb();
  const env = {
    DB,
    AI: { async run(model, payload) {
      const system = payload.messages.find(x => x.role === 'system')?.content || '';
      assert.match(system, /Tên được sử dụng: Phan Thuần/);
      assert.match(system, /Phan Thuần là người mà trợ lý PHAN THUẦN XTRA đang đại diện hỗ trợ/);
      assert.match(system, /hồ sơ truyền thông chính thức — do chủ website cung cấp/i);
      assert.match(system, /PhanThuanSaigon/);
      assert.match(system, /Phan Thuần Xuyên Á Auto/);
      assert.match(system, /720 Trường Chinh/);
      return { response: 'Phan Thuần là người mà trợ lý PHAN THUẦN XTRA đang đại diện hỗ trợ và là tên gắn với thương hiệu PHAN THUẦN XTRA.' };
    } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method: 'POST', headers: {'content-type':'application/json'},
    body: JSON.stringify({conversation_id:'identity-test',visitor_id:'identity-test',message:'Phan Thuần là ai'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.needs_human, false);
  assert.match(data.reply, /Phan Thuần/);
});

test('unknown topic is handed to human and stored for later knowledge update', async () => {
  const DB = mockDb();
  const env = {
    DB,
    AI_SEARCH: { async search() { return { chunks: [] }; } },
    AI: { async run() { throw new Error('AI must not answer an out-of-scope question'); } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'unknown-test',visitor_id:'unknown-test',message:'Chính sách bảo hành ngoài thông tin xe hiện có là gì?'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.needs_human, true);
  assert.match(data.reply, /thông tin xác thực/);
  assert.match(data.reply, /số điện thoại/);
  assert.equal(DB._unknown.length, 1);
});

test('unknown topic accepts name and phone from the same message', async () => {
  const DB = mockDb();
  const env = {
    DB,
    AI_SEARCH: { async search() { return { chunks: [] }; } },
    AI: { async run() { throw new Error('AI must not answer an out-of-scope question'); } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'contact-test',visitor_id:'contact-test',message:'Tôi tên Phan Thuần, số điện thoại 0866997891. Tôi muốn hỏi thông tin chưa có trên website.'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.needs_human, true);
  assert.equal(DB._unknown[0].phone, '0866997891');
});

test('website AI chat rejects empty messages', async () => {
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({message:'   '})
  }), {DB:mockDb()});
  assert.equal(response.status, 400);
});


test('Phan Thuần ecosystem lookup expands AI Search with official aliases and public corroboration terms', async () => {
  const DB = mockDb();
  let searchPayload = null;
  const env = {
    DB,
    AI_SEARCH: { async search(payload) { searchPayload = payload; return { chunks: [] }; } },
    AI: { async run(model, payload) {
      const system = payload.messages.find(x => x.role === 'system')?.content || '';
      assert.match(system, /European Yachts/);
      assert.match(system, /Business Jets/);
      assert.match(system, /Green Energy/);
      return { response: 'Theo hồ sơ chính thức do chủ website cung cấp, Phan Thuần/PHAN THUẦN XTRA được giới thiệu với Luxury Automotive, European Yachts, Business Jets và Green Energy.' };
    } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'profile-search-test',visitor_id:'profile-search-test',message:'Phan Thuần làm những lĩnh vực gì?'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.needs_human, false);
  const q = searchPayload?.messages?.[0]?.content || '';
  assert.match(q, /phanthuanxtra/i);
  assert.match(q, /PhanThuanSaigon/);
  assert.match(q, /Ô tô Xuyên Á Phan Thuần/);
  assert.match(q, /Green Energy/);
});


test('ASCII Vietnamese identity question "phan thuan la ai" is answered without Workers AI', async () => {
  const DB = mockDb();
  let aiCalls = 0;
  const env = {
    DB,
    AI: { async run() { aiCalls += 1; throw new Error('Workers AI should not be required for basic identity'); } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'ascii-identity',visitor_id:'ascii-identity',message:'phan thuan la ai'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.ok, true);
  assert.equal(data.needs_human, false);
  assert.match(data.reply, /Phan Thuần/);
  assert.match(data.reply, /PHAN THUẦN XTRA/);
  assert.equal(aiCalls, 0);
});

test('ASCII Vietnamese vehicle query uses only visible website catalog when Workers AI is unavailable', async () => {
  const DB = mockDb([
    {id:'lexus-live',brand:'Lexus',model:'LX 600',year:2025,mileage:100,status:'available',price:1,category:'suv'},
    {id:'ci-hidden',brand:'PT XTRA TEST',model:'CI E2E Vehicle',year:2026,mileage:1,status:'hidden',price:1,category:'suv'}
  ]);
  const env = {
    DB,
    AI_SEARCH: { async search() { return {chunks:[]}; } },
    AI: { async run() { throw new Error('quota 4006'); } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'ascii-cars',visitor_id:'ascii-cars',message:'website co xe nao'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.needs_human, false);
  assert.match(data.reply, /Lexus LX 600 2025/);
  assert.doesNotMatch(data.reply, /CI E2E Vehicle/);
  assert.match(data.reply, /họ tên \+ số điện thoại/i);
});
