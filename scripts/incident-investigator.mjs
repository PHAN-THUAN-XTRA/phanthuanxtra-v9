import crypto from "node:crypto";
import {execFileSync} from "node:child_process";
import {readFile,writeFile,appendFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";

const REPORT_PATH=process.env.SECURITY_OPERATOR_REPORT||"security-operator-report.json";
const OUTPUT_PATH=process.env.INCIDENT_INVESTIGATION_REPORT||"incident-investigation.json";

const clean=(v,n=2000)=>String(v??"").replace(/\s+/g," ").trim().slice(0,n);
const sh=(args)=>execFileSync("git",args,{encoding:"utf8"}).trim();
const minutesSince=(iso)=>{const t=Date.parse(String(iso||""));return Number.isFinite(t)?Math.max(0,(Date.now()-t)/60000):Infinity};
const severityRank={high:1,critical:2};

function highestSeverity(findings=[]){
  return findings.reduce((best,x)=>(severityRank[x?.severity]||0)>(severityRank[best]||0)?x?.severity:best,"none");
}
function incidentHash(report){
  const payload=JSON.stringify({
    generated_at:String(report?.generated_at||"").slice(0,16),
    findings:(report?.findings||[]).map(x=>[x.key,x.severity]).sort()
  });
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0,12);
}
function latestCommit(){
  const sha=sh(["rev-parse","HEAD"]);
  const parentCount=Number(sh(["rev-list","--parents","-n","1",sha]).split(/\s+/).length-1);
  const committed_at=sh(["show","-s","--format=%cI",sha]);
  const subject=clean(sh(["show","-s","--format=%s",sha]),240);
  const changed=parentCount===1?sh(["diff","--name-only",sha+"^",sha]).split(/\r?\n/).filter(Boolean):[];
  return {sha,parentCount,committed_at,subject,changed,age_minutes:Math.round(minutesSince(committed_at)*10)/10};
}
function codeRelated(findings=[]){
  return findings.some(x=>["health-endpoint-down","homepage-down","worker-5xx-high","worker-5xx-critical"].includes(x?.key));
}
function topValue(items=[]){return Array.isArray(items)&&items[0]?.value?clean(items[0].value,180):null}

export function buildAttackAssessment(report={}){
  const findings=Array.isArray(report?.findings)?report.findings:[];
  const attack=findings.find(x=>["waf-spike-high","waf-spike-critical"].includes(x?.key));
  const analytics=report?.analytics||{};
  const baseline=report?.baseline?.comparison||{};
  if(!attack){
    return{
      status:"no-waf-attack-signal",
      confidence:"none",
      evidence:{waf_events:Number(analytics?.wafEvents||0),baseline_ready:baseline?.ready===true},
      mitigation_proposal:null
    };
  }
  const wafEvents=Number(analytics?.wafEvents||0);
  const ratio=Number(baseline?.waf_ratio);
  const topPath=topValue(analytics?.wafTopPaths);
  const topCountry=topValue(analytics?.wafTopCountries);
  const topSource=topValue(analytics?.wafTopSources);
  const topAction=topValue(analytics?.wafTopActions);
  const confidence=attack.severity==="critical"||(Number.isFinite(ratio)&&ratio>=8)?"high":(Number.isFinite(ratio)&&ratio>=4)?"medium":"guarded";
  return{
    status:"owner-review-required",
    confidence,
    evidence:{
      signal:attack.key,
      severity:attack.severity,
      waf_events:wafEvents,
      baseline_ready:baseline?.ready===true,
      baseline_avg_waf_events:Number(baseline?.avg_waf_events||0),
      waf_ratio:Number.isFinite(ratio)?ratio:null,
      top_path:topPath,
      top_country:topCountry,
      top_source:topSource,
      top_action:topAction
    },
    mitigation_proposal:{
      apply:false,
      requires_owner_approval:true,
      preferred_action:"managed_challenge_or_rate_limit_review",
      expression_hint:topPath?`http.request.uri.path eq ${JSON.stringify(topPath)}`:null,
      scope_hint:{path:topPath,country:topCountry,security_source:topSource},
      rationale:"Use sampled Security Events and baseline concentration to propose a narrow mitigation. Validate false-positive risk before any Cloudflare rule change."
    }
  };
}
function dangerousRevertFiles(files=[]){
  const deny=[
    /^migrations\//,
    /^wrangler\.json$/,
    /^\.github\/workflows\/deploy-cloudflare\.yml$/,
    /^scripts\/deploy-cloudflare-api\.mjs$/,
    /^scripts\/full-system-backup\.mjs$/,
    /^developer-gateway\//
  ];
  return files.filter(f=>deny.some(re=>re.test(f)));
}

export function planRemediation(report,commit){
  const findings=Array.isArray(report?.findings)?report.findings:[];
  const highest=highestSeverity(findings);
  const codeIncident=codeRelated(findings);
  const blockedFiles=dangerousRevertFiles(commit?.changed||[]);
  const recent=Number(commit?.age_minutes)<=60;
  const singleParent=Number(commit?.parentCount)===1;
  const critical=highest==="critical";
  const candidate=Boolean(critical&&codeIncident&&recent&&singleParent&&blockedFiles.length===0);
  const reasons=[];
  if(!critical)reasons.push("highest_severity_not_critical");
  if(!codeIncident)reasons.push("no_code_runtime_signal");
  if(!recent)reasons.push("latest_main_commit_older_than_60_minutes");
  if(!singleParent)reasons.push("latest_commit_not_single_parent");
  if(blockedFiles.length)reasons.push("latest_commit_touches_high_risk_paths");
  return{
    candidate,
    kind:candidate?"draft-revert-latest-main":"report-only",
    target_sha:candidate?commit.sha:null,
    branch:candidate?"incident/revert-"+commit.sha.slice(0,10):null,
    blocked_files:blockedFiles,
    reasons:candidate?["bounded_recent_runtime_revert_candidate"]:reasons
  };
}

export async function investigate(){
  const report=JSON.parse(await readFile(REPORT_PATH,"utf8"));
  const commit=latestCommit();
  const remediation=planRemediation(report,commit);
  const findings=Array.isArray(report?.findings)?report.findings:[];
  const result={
    schema:1,
    incident_id:"sec-"+incidentHash(report),
    generated_at:new Date().toISOString(),
    source_report_generated_at:report?.generated_at||null,
    highest_severity:highestSeverity(findings),
    findings:findings.map(x=>({key:x.key,severity:x.severity,summary:clean(x.summary,500)})),
    latest_main_commit:commit,
    remediation,
    phase3:buildAttackAssessment(report),
    policy:{
      auto_merge:false,
      production_deploy:false,
      firewall_mutation:false,
      waf_proposal_only:true,
      waf_owner_approval_required:true,
      secret_rotation:false,
      paid_ai_fallback:false,
      draft_pr_only_for_recent_critical_code_incident:true
    }
  };
  await writeFile(OUTPUT_PATH,JSON.stringify(result,null,2));
  if(process.env.GITHUB_OUTPUT){
    await appendFile(process.env.GITHUB_OUTPUT,
      "incident_id="+result.incident_id+"\n"+
      "highest_severity="+result.highest_severity+"\n"+
      "candidate="+String(remediation.candidate)+"\n"+
      "target_sha="+(remediation.target_sha||"")+"\n"+
      "branch="+(remediation.branch||"")+"\n"
    );
  }
  return result;
}

if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
  const r=await investigate();
  console.log(JSON.stringify({incident_id:r.incident_id,highest_severity:r.highest_severity,remediation:r.remediation}));
}
