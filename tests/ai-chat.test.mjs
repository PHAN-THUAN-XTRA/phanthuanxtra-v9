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
              if (sql.includes('INSERT INTO ai_unknown_questions')) {
                const row={id:unknown.length+1,conversation_id:args[0],question:args[1],name:args[2],phone:args[3],status:'pending'};
                unknown.push(row);
                return {meta:{last_row_id:row.id,changes:1}};
              }
              if (sql.includes('UPDATE ai_unknown_questions SET name=COALESCE')) {
                const row=unknown.find(x=>x.id===args[2]);
                if(row){if(args[0])row.name=args[0];if(args[1])row.phone=args[1];}
                return {meta:{changes:row?1:0}};
              }
              return {meta:{changes:1}};
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

test('website AI chat uses visible D1 catalog and GLM -> Qwen fallback without AI Search', async () => {
  const DB = mockDb([
    {id:'lexus-live',brand:'Lexus',model:'LX 600',year:2025,mileage:100,status:'available',price:1,category:'suv'},
    {id:'hidden-car',brand:'Ferrari',model:'Hidden Test',year:2026,mileage:1,status:'hidden',price:1,category:'sport'}
  ]);
  let searchCalls = 0;
  const modelCalls = [];
  const env = {
    DB,
    AI_SEARCH: { async search() { searchCalls += 1; return { chunks:[{content:'Ferrari ngoài catalog không được dùng'}] }; } },
    AI: { async run(model, payload) {
      modelCalls.push(model);
      if (model === '@cf/zai-org/glm-4.7-flash') throw new Error('transient primary failure');
      assert.equal(model, '@cf/qwen/qwen3.8-27b');
      const system = payload.messages.find(x=>x.role==='system')?.content || '';
      assert.match(system, /Lexus/);
      assert.doesNotMatch(system, /Hidden Test/);
      assert.doesNotMatch(system, /Ferrari ngoài catalog/);
      assert.equal(payload.messages.at(-1).content, 'Tôi muốn tìm Lexus');
      return { response: 'Lexus LX 600 2025 đang có trên website. Anh/chị vui lòng để lại họ tên + số điện thoại nếu muốn anh Phan Thuần tư vấn trực tiếp.' };
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
  assert.equal(data.ai_model, '@cf/qwen/qwen3.8-27b');
  assert.equal(searchCalls, 0);
  assert.deepEqual(modelCalls, ['@cf/zai-org/glm-4.7-flash','@cf/qwen/qwen3.8-27b']);
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


test('vehicle query with empty website catalog does not call Workers AI or AI Search', async () => {
  const DB = mockDb([]);
  let aiCalls = 0;
  let searchCalls = 0;
  const env = {
    DB,
    AI_SEARCH: { async search() { searchCalls += 1; return {chunks:[]}; } },
    AI: { async run() { aiCalls += 1; return {response:'Không được gọi'}; } }
  };
  const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'empty-catalog',visitor_id:'empty-catalog',message:'Tôi muốn mua Ferrari'})
  }), env);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.needs_human, false);
  assert.match(data.reply, /chưa có xe trong catalog/i);
  assert.equal(aiCalls, 0);
  assert.equal(searchCalls, 0);
  assert.equal(data.ai_model, null);
});

test('unknown handoff remembers name then completes when phone arrives in a later message', async () => {
  const DB = mockDb();
  const env = {
    DB,
    AI_SEARCH: { async search() { return { chunks: [] }; } },
    AI: { async run() { throw new Error('AI must not answer out-of-scope questions'); } }
  };
  const first = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'handoff-two-turns',visitor_id:'handoff-two-turns',message:'Tôi tên là Nguyễn Văn An. Tôi muốn hỏi một dịch vụ chưa có trên website.'})
  }), env);
  const firstData = await first.json();
  assert.equal(firstData.needs_human, true);
  assert.match(firstData.reply, /số điện thoại/i);
  assert.equal(DB._unknown[0].name, 'Nguyễn Văn An');

  const second = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
    method:'POST', headers:{'content-type':'application/json'},
    body:JSON.stringify({conversation_id:'handoff-two-turns',visitor_id:'handoff-two-turns',message:'Số điện thoại của tôi là 0909123456'})
  }), env);
  const secondData = await second.json();
  assert.equal(secondData.needs_human, true);
  assert.match(secondData.reply, /đã tiếp nhận họ tên và số điện thoại/i);
  assert.equal(DB._unknown[0].name, 'Nguyễn Văn An');
  assert.equal(DB._unknown[0].phone, '0909123456');
});


for (const [label, message, expected] of [
  ['Green Energy', 'Tư vấn điện mặt trời PV và ESS', /Green Energy|ESS|điện mặt trời/i],
  ['Yachts', 'Tôi muốn tư vấn du thuyền', /yacht|du thuyền|Jeanneau|Prestige/i],
  ['Business Jets', 'Tư vấn chuyên cơ thương gia', /Business Jets|Legacy 600|chuyên cơ/i],
  ['Contact', 'Hotline liên hệ là gì?', /0866 997 891/]
]) {
  test(`website AI advises published ${label} content without AI Search`, async () => {
    const DB = mockDb();
    const env = {
      DB,
      AI: { async run(model, payload) {
        const system = payload.messages.find(x=>x.role==='system')?.content || '';
        assert.match(system, expected);
        assert.match(system, /toàn bộ nội dung chính thức/i);
        return {response: label === 'Contact' ? 'Hotline chính thức là 0866 997 891.' : `Tôi có thể tư vấn ${label} theo nội dung chính thức đang công bố trên website.`};
      }}
    };
    const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({conversation_id:`full-site-${label.replace(/\\s+/g,'-')}`,visitor_id:'coverage-test',message})
    }), env);
    const data = await response.json();
    assert.equal(response.status, 200);
    assert.equal(data.ok, true);
    assert.equal(data.needs_human, false);
  });
}

test('website topics retain grounded answers when all Workers AI models fail', async () => {
  const scenarios = [
    ['Tư vấn điện mặt trời PV và ESS trên website', /Green Energy.*PV.*ESS/s],
    ['Tôi muốn tư vấn du thuyền theo nội dung website', /European Yachts.*du thuyền/s],
    ['Tôi muốn tư vấn chuyên cơ thương gia theo nội dung website', /Business Jets.*chuyên cơ/s],
    ['Hotline liên hệ chính thức là gì?', /0866 997 891/]
  ];
  for (const [message, expected] of scenarios) {
    const DB = mockDb();
    const response = await handleAiChat(new Request('https://phanthuanxtra.com/api/ai-chat', {
      method:'POST', headers:{'content-type':'application/json'},
      body:JSON.stringify({conversation_id:crypto.randomUUID(),message})
    }), { DB, AI_SEARCH:{async search(){throw new Error('search unavailable');}}, AI:{async run(){throw new Error('quota 4006');}} });
    const data = await response.json();
    assert.equal(response.status, 200, message);
    assert.equal(data.ok, true, message);
    assert.equal(data.needs_human, false, message);
    assert.equal(data.ai_model, null, message);
    assert.match(data.reply, expected, message);
    assert.doesNotMatch(data.reply, /giá thuê là|công suất là|lịch bay đã đặt/i);
    assert.equal(DB._unknown.length, 0);
  }
});
