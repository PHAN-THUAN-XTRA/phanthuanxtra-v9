import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCaption } from '../src/telegram.js';
import { canAutoPublish, promoteDraft } from '../src/telegram-ingest.js';
import { telegramWebhookReceipt } from '../src/telegram-router.js';

const VALID_PLATE_BBOX = { x: 0.25, y: 0.45, width: 0.5, height: 0.12 };

test('Telegram caption keeps Vietnamese Unicode and real vehicle fields',()=>{
  const caption=buildCaption({id:'lx600-urban',brand:'Lexus',model:'LX 600 Urban',year:2024,mileage:12000,color:'Trắng ngọc trai',interior:'Đen',engine:'V6 3.5 Twin Turbo',transmission:'10AT',seats:7,origin:'Nhật Bản',price:8650000000,status:'available',features_json:JSON.stringify(['Mark Levinson','Camera 360','Cửa sổ trời']),description:'Xe thực tế tại showroom.'});
  assert.match(caption,/Lexus LX 600 Urban/);
  assert.match(caption,/12\.000 km/);
  assert.match(caption,/Trắng ngọc trai/);
  assert.match(caption,/Mark Levinson/);
  assert.match(caption,/PHAN THUẦN|Phan Thuần Xtra/);
});

test('Telegram caption omits fields that are not present instead of inventing data',()=>{
  const caption=buildCaption({id:'porsche-718',brand:'Porsche',model:'718 Boxster',features_json:'[]',status:'available'});
  assert.match(caption,/Porsche 718 Boxster/);
  assert.doesNotMatch(caption,/2025/);
  assert.doesNotMatch(caption,/ODO:/);
  assert.doesNotMatch(caption,/Twin Turbo/);
});

test('Telegram AI draft auto-publish requires real identity and high confidence; plate box is optional branding',()=>{
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.85,plate_bbox:VALID_PLATE_BBOX}),true);
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.849,plate_bbox:VALID_PLATE_BBOX}),false);
  assert.equal(canAutoPublish({brand:'Lexus',model:null,confidence:0.99,plate_bbox:VALID_PLATE_BBOX}),false);
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.99,plate_bbox:null}),true);
});

test('Telegram webhook receipt is immediate and independent of downstream processing',()=>{
  const photoReceipt=telegramWebhookReceipt(true);
  const textReceipt=telegramWebhookReceipt(false);
  assert.match(photoReceipt,/ĐÃ NHẬN ẢNH XE/);
  assert.match(textReceipt,/ĐÃ NHẬN THÔNG TIN XE/);
  assert.doesNotMatch(photoReceipt,/D1|R2|AI|publish/);
  assert.doesNotMatch(textReceipt,/D1|R2|AI|publish/);
  assert.match(photoReceipt,/Đang kiểm tra và xử lý/);
});

test('PT Xtra branding is not a vehicle identity gate',()=>{
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.85,plate_bbox:VALID_PLATE_BBOX}),true);
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.85,plate_bbox:null}),true);
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.85,plate_bbox:VALID_PLATE_BBOX,plate_text:'PT Xtra'}),true);
  assert.equal(canAutoPublish({brand:'Lexus',model:'LX 600',confidence:0.85,plate_bbox:VALID_PLATE_BBOX,plate_text:'12A-123.45'}),true);
});

test('Telegram publish duplicate protection sends only once',async()=>{
  const cars=new Map([['tg-101',{id:'tg-101',brand:'Lexus',model:'LX 600',year:2024,mileage:1000,price:9000000000,status:'available',features_json:'[]',description:'Xe thực tế.'}]]);
  const posts=new Map();
  const images=new Map();
  const calls=[];
  const DB={
    prepare(sql){
      return {bind(...args){
        return {
          async first(){
            if(sql.includes('SELECT id,status FROM cars')) return cars.get(args[0])||null;
            if(sql.includes('SELECT * FROM cars')) return cars.get(args[0])||null;
            if(sql.includes('SELECT * FROM telegram_posts')) return posts.get(args[0])||null;
            if(sql.includes('SELECT id FROM car_images')) return null;
            return null;
          },
          async all(){
            if(sql.includes('SELECT url FROM car_images')) return {results:images.get(args[0])||[]};
            return {results:[]};
          },
          async run(){
            if(sql.includes('INSERT INTO telegram_posts')) posts.set(args[0],{car_id:args[0],status:'pending',attempts:1});
            else if(sql.includes("UPDATE telegram_posts SET status='published'")){const p=posts.get(args[1]);posts.set(args[1],{...p,status:'published',telegram_message_ids:args[0]});}
            else if(sql.includes("UPDATE telegram_posts SET status='failed'")){const p=posts.get(args[1]);posts.set(args[1],{...p,status:'failed',last_error:args[0]});}
            else if(sql.includes('INSERT INTO car_images')){const list=images.get(args[0])||[];list.push({url:args[1]});images.set(args[0],list);}
            return {};
          }
        };
      }};
    }
  };
  const env={DB,TELEGRAM_BOT_TOKEN:'test-token',TELEGRAM_CHAT_ID:'-1001'};
  const originalFetch=global.fetch;
  global.fetch=async()=>{calls.push(1);return new Response(JSON.stringify({ok:true,result:{message_id:calls.length}}),{status:200,headers:{'content-type':'application/json'}})};
  try{
    const draft={brand:'Lexus',model:'LX 600',year:2024,mileage:1000,price:9000000000,confidence:0.95,plate_bbox:VALID_PLATE_BBOX,features:[],missing_fields:[]};
    const first=await promoteDraft(env,101,draft,'vehicles/publish-inbox-101-test.jpg');
    assert.equal(first.published,true);
    const callsAfterFirst=calls.length;
    const second=await promoteDraft(env,101,draft,'vehicles/publish-inbox-101-test.jpg');
    assert.equal(second.published,true);
    assert.equal(second.telegram.duplicate,true);
    assert.equal(calls.length,callsAfterFirst);
    assert.equal(posts.get('tg-101').status,'published');
  }finally{global.fetch=originalFetch;}
});


test('Telegram router source locks complementary pairing plus full WebP album publishing', async()=>{
  const fs=await import('node:fs');
  const source=fs.readFileSync(new URL('../src/telegram-router.js',import.meta.url),'utf8');
  assert.match(source,/rowHasPhoto && !rowHasText/);
  assert.match(source,/!rowHasPhoto && rowHasText/);
  assert.match(source,/const photoRows = rows\.filter\(row => row\.file_id\)/);
  assert.match(source,/publishMediaKeys = processed\.map/);
  assert.match(source,/\.webp`/);
  assert.match(source,/createPtXtraPlateImage\(env, bytes, contentType, plate, publishMediaKey, "image\/webp"\)/);
  assert.match(source,/promoteDraft\(env, inboxId, ai, publishMediaKeys\[0\], publishMediaKeys\)/);
  assert.match(source,/TỰ ĐĂNG XE/);
});
