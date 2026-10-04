import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function fixture() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(`CREATE TABLE cars(id TEXT,brand TEXT,model TEXT,year INTEGER,price INTEGER,mileage INTEGER,status TEXT,description TEXT,features_json TEXT,featured INTEGER,created_at TEXT,cover_image TEXT);
    CREATE TABLE car_images(id INTEGER,car_id TEXT,url TEXT,sort_order INTEGER,is_cover INTEGER);
    CREATE TABLE posts(id INTEGER,slug TEXT,status TEXT);
    INSERT INTO cars VALUES ('tg-test','LEXUS','RX350L',2020,2000000000,NULL,'available','Xe thật\nGiá owner','["Camera"]',1,'2026-10-04', '/media/cover.webp');
    INSERT INTO cars VALUES ('tg-hidden','AUDI','Q7',2017,1050000000,0,'hidden','private', '[]',0,'2026-10-04','');
    INSERT INTO cars VALUES ('tg-draft','AUDI','Draft',2017,NULL,NULL,'draft','private', '[]',0,'2026-10-04','');
    INSERT INTO car_images VALUES(1,'tg-test','/media/cover.webp',0,1),(2,'tg-test','/media/rear.webp',1,0);
    INSERT INTO posts VALUES(1,'public-post','published'),(2,'private-post','draft');`);
  const DB = {prepare(sql){let args=[];return {bind(...v){args=v;return this},async first(){return sqlite.prepare(sql).get(...args)},async all(){return {results:sqlite.prepare(sql).all(...args)}}}}};
  const env = {DB,ASSETS:{async fetch(r){const path=new URL(r.url).pathname;return new Response(readFileSync('public'+path,'utf8'))}}};
  return {env,sqlite};
}
