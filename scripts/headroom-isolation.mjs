import fs from "node:fs";
const p=JSON.parse(fs.readFileSync("tools/headroom.json","utf8"));
const sha=/^[0-9a-f]{40}$/;
if(p.upstream!=="headroomlabs-ai/headroom") throw new Error("unexpected upstream");
if(!sha.test(p.commit)) throw new Error("Headroom commit must be pinned");
if(p.mode!=="audit-only") throw new Error("Headroom must remain audit-only");
for(const k of ["production_access","production_secrets","proxy","memory","telemetry","ccr_disk_cache"]){
 if(p[k]!==false) throw new Error(`${k} must remain false`);
}
console.log(JSON.stringify({ok:true,upstream:p.upstream,commit:p.commit,version:p.version,mode:p.mode}));
