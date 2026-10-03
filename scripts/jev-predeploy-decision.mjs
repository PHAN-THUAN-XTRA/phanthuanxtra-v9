import fs from "node:fs";

const key=process.env.TYPESAFE_API_KEY||"";
const base=process.env.AUDIT_BASE_SHA||"";
const head=process.env.AUDIT_HEAD_SHA||"";
const statePath=process.env.JEV_STATE_FILE||"";
if(!key){
  console.log(JSON.stringify({enabled:false,reason:"TYPESAFE_API_KEY not configured; deterministic + LLM gates remain authoritative"}));
  process.exit(0);
}
if(!statePath||!fs.existsSync(statePath)) throw new Error("JEV_STATE_FILE missing");
const state=fs.readFileSync(statePath,"utf8").slice(0,120000);
const payload={
  model:"jev-latest",
  state:{repository:"PHAN-THUAN-XTRA/phanthuanxtra-v9",base_sha:base,head_sha:head,audit_input:state},
  questions:{
    security_risk:{type:"noul",instructions:"Does this change contain a material security, credential, authentication, authorization, injection, privacy, or destructive-data risk that should block merge?"},
    production_risk:{type:"noul",instructions:"Does this change contain a material Cloudflare Worker, D1, R2, Telegram, deployment, or production reliability risk that should block merge?"},
    needs_llm_review:{type:"noul",instructions:"Is this change ambiguous or complex enough that a generative LLM reviewer should inspect it rather than relying only on deterministic checks and typed decisions?"}
  }
};
const res=await fetch("https://api.typesafe.ai/v1/systemone",{method:"POST",headers:{authorization:`Bearer ${key}`,"content-type":"application/json"},body:JSON.stringify(payload)});
if(!res.ok)throw new Error(`TypeSafe API ${res.status}: ${(await res.text()).slice(0,300)}`);
const data=await res.json();
function prob(name){
 const a=data.answers?.[name]??data[name]??data.nouls?.[name];
 const v=a?.noul??a?.probability??a?.value;
 if(typeof v!=="number")throw new Error(`Missing probability for ${name}`);
 return v;
}
const out={enabled:true,model:data.model||"jev-latest",security_risk:prob("security_risk"),production_risk:prob("production_risk"),needs_llm_review:prob("needs_llm_review")};
console.log(JSON.stringify(out));
fs.writeFileSync("jev-decision.json",JSON.stringify(out,null,2));
if(out.security_risk>=0.90||out.production_risk>=0.90){
 console.error("Jev high-confidence risk gate triggered; require human/LLM review before merge.");
 process.exit(2);
}
