import {writeFile} from "node:fs/promises";
import {classifySecuritySignals,compareTelemetryBaseline} from "./security-operator.mjs";
import {planRemediation,buildAttackAssessment} from "./incident-investigator.mjs";

const OUTPUT=process.env.SECURITY_RECOVERY_DRILL_REPORT||"security-recovery-drill.json";
const pass=(name,details={})=>({name,ok:true,details});
function must(condition,message){if(!condition)throw new Error(message)}

export async function runRecoveryDrill(){
  const checks=[];

  const baseline=compareTelemetryBaseline(
    {wafEvents:12,errorRate:0},
    {sample_count:12,avg_total_requests:42,avg_waf_events:3,avg_error_rate:0.2}
  );
  must(baseline.ready===true,"baseline should be ready");
  must(baseline.waf_ratio===4,"baseline ratio should be deterministic");
  checks.push(pass("baseline-comparison",{waf_ratio:baseline.waf_ratio,samples:baseline.sample_count}));

  const wafClassification=classifySecuritySignals({
    healthOk:true,homeOk:true,analyticsOk:true,wafTelemetryOk:true,
    totalRequests:1000,error5xx:0,wafEvents:700
  });
  const wafReport={
    findings:wafClassification.findings,
    analytics:{
      wafEvents:700,
      wafTopActions:[{value:"managed_challenge",count:650}],
      wafTopPaths:[{value:"/admin",count:610}],
      wafTopCountries:[{value:"US",count:410}],
      wafTopSources:[{value:"waf",count:700}]
    },
    baseline:{comparison:{ready:true,avg_waf_events:20,waf_ratio:35}}
  };
  const attack=buildAttackAssessment(wafReport);
  const wafPlan=planRemediation(wafReport,{
    sha:"a".repeat(40),age_minutes:5,parentCount:1,changed:["src/index.js"]
  });
  must(attack.status==="owner-review-required","WAF incident should produce owner review proposal");
  must(attack.mitigation_proposal?.apply===false,"WAF proposal must never auto-apply");
  must(attack.mitigation_proposal?.requires_owner_approval===true,"WAF proposal must require owner approval");
  must(wafPlan.candidate===false,"WAF-only incident must not create code revert candidate");
  checks.push(pass("waf-attack-proposal",{confidence:attack.confidence,proposal:attack.mitigation_proposal.preferred_action}));

  const runtimeReport={findings:[{key:"homepage-down",severity:"critical"}]};
  const runtimePlan=planRemediation(runtimeReport,{
    sha:"b".repeat(40),age_minutes:10,parentCount:1,changed:["src/entry.js","test/runtime.test.js"]
  });
  must(runtimePlan.candidate===true,"recent isolated runtime failure should produce bounded draft revert candidate");
  must(runtimePlan.kind==="draft-revert-latest-main","runtime recovery kind mismatch");
  checks.push(pass("runtime-draft-revert-gate",{kind:runtimePlan.kind}));

  const telemetryReport={findings:[{key:"security-telemetry-unavailable",severity:"high"}]};
  const telemetryPlan=planRemediation(telemetryReport,{
    sha:"c".repeat(40),age_minutes:5,parentCount:1,changed:["src/index.js"]
  });
  must(telemetryPlan.candidate===false,"telemetry degradation must remain report-only");
  checks.push(pass("telemetry-report-only",{reasons:telemetryPlan.reasons}));

  const healthy=classifySecuritySignals({
    healthOk:true,homeOk:true,analyticsOk:true,wafTelemetryOk:true,
    totalRequests:120,error5xx:0,wafEvents:3
  });
  must(healthy.findings.length===0,"healthy scenario should have no findings");
  checks.push(pass("healthy-recovery-state",{findings:0}));

  const report={
    schema:1,
    generated_at:new Date().toISOString(),
    mode:"synthetic-no-production-mutation",
    checks,
    policy:{
      secrets_used:false,
      production_network_called:false,
      git_mutation:false,
      pull_request_created:false,
      production_deploy:false,
      firewall_mutation:false,
      paid_ai:false
    }
  };
  await writeFile(OUTPUT,JSON.stringify(report,null,2));
  return report;
}

if(import.meta.url===new URL("file://"+process.argv[1]).href){
  const report=await runRecoveryDrill();
  console.log(JSON.stringify({ok:true,checks:report.checks.length,policy:report.policy}));
}
