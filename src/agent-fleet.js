const AGENTS=[
  {
    "id": "agent-01",
    "name": "Market Signal Scout",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-02",
    "name": "Competitor Watch",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-03",
    "name": "Search Demand Scout",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-04",
    "name": "Trend Interpreter",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-05",
    "name": "Audience Insight",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-06",
    "name": "Offer Intelligence",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-07",
    "name": "Vehicle Market Scout",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-08",
    "name": "Research Verifier",
    "department": "intelligence",
    "mode": "read"
  },
  {
    "id": "agent-09",
    "name": "Content Strategist",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-10",
    "name": "Brief Builder",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-11",
    "name": "Brand Voice Writer",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-12",
    "name": "SEO Editor",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-13",
    "name": "GEO Editor",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-14",
    "name": "Social Copywriter",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-15",
    "name": "Video Script Writer",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-16",
    "name": "Creative Brief Agent",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-17",
    "name": "Content QA",
    "department": "content",
    "mode": "draft"
  },
  {
    "id": "agent-18",
    "name": "Channel Planner",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-19",
    "name": "Publishing Scheduler",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-20",
    "name": "Website Publisher",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-21",
    "name": "Telegram Distributor",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-22",
    "name": "Social Queue Manager",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-23",
    "name": "Repurpose Agent",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-24",
    "name": "Campaign Coordinator",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-25",
    "name": "Distribution QA",
    "department": "distribution",
    "mode": "approval"
  },
  {
    "id": "agent-26",
    "name": "Lead Intake",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-27",
    "name": "Identity Resolver",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-28",
    "name": "Vehicle Interest Mapper",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-29",
    "name": "Needs Extractor",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-30",
    "name": "Lead Qualifier",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-31",
    "name": "Care Status Agent",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-32",
    "name": "Follow-up Planner",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-33",
    "name": "Proposal Agent",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-34",
    "name": "CRM Auditor",
    "department": "crm",
    "mode": "approval"
  },
  {
    "id": "agent-35",
    "name": "Mention Watch",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-36",
    "name": "Review Triage",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-37",
    "name": "Sentiment Analyst",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-38",
    "name": "Reply Drafter",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-39",
    "name": "Escalation Agent",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-40",
    "name": "Promise Guard",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-41",
    "name": "Reputation Reporter",
    "department": "reputation",
    "mode": "approval"
  },
  {
    "id": "agent-42",
    "name": "KPI Collector",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-43",
    "name": "Attribution Analyst",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-44",
    "name": "Content Performance",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-45",
    "name": "Lead Funnel Analyst",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-46",
    "name": "Customer Care Analyst",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-47",
    "name": "Conversion Analyst",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-48",
    "name": "Anomaly Detector",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-49",
    "name": "ROI Reporter",
    "department": "analytics",
    "mode": "read"
  },
  {
    "id": "agent-50",
    "name": "Queue Monitor",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-51",
    "name": "Workflow Router",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-52",
    "name": "Failure Recovery",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-53",
    "name": "SLA Monitor",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-54",
    "name": "Data Quality Agent",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-55",
    "name": "Media Pipeline Agent",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-56",
    "name": "Release Evidence Agent",
    "department": "operations",
    "mode": "read"
  },
  {
    "id": "agent-57",
    "name": "Chief Orchestrator",
    "department": "governance",
    "mode": "control"
  },
  {
    "id": "agent-58",
    "name": "Permission Guard",
    "department": "governance",
    "mode": "control"
  },
  {
    "id": "agent-59",
    "name": "Evidence Guard",
    "department": "governance",
    "mode": "control"
  },
  {
    "id": "agent-60",
    "name": "Brand Guard",
    "department": "governance",
    "mode": "control"
  },
  {
    "id": "agent-61",
    "name": "Approval Gate",
    "department": "governance",
    "mode": "control"
  },
  {
    "id": "agent-62",
    "name": "Kill Switch Controller",
    "department": "governance",
    "mode": "control"
  }
];
const DEPARTMENTS=[
  {
    "id": "intelligence",
    "count": 8
  },
  {
    "id": "content",
    "count": 9
  },
  {
    "id": "distribution",
    "count": 8
  },
  {
    "id": "crm",
    "count": 9
  },
  {
    "id": "reputation",
    "count": 7
  },
  {
    "id": "analytics",
    "count": 8
  },
  {
    "id": "operations",
    "count": 7
  },
  {
    "id": "governance",
    "count": 6
  }
];
const EXECUTION_PROFILES={
  "agent-26":{status:"executing",workflow:"createLeadReplaySafe",authBoundary:"public lead ingress + explicit idempotency key/visitor binding",idempotency:"xtra_lead_intake_requests primary-key claim + payload fingerprint",audit:"durable intake ledger + lead/customer link + Memory Brain event",retry:"same-key replay returns canonical lead; failures retain ledger state",permission:"create lead/customer link only; no lead deletion/status escalation"},
  "agent-27":{status:"executing",workflow:"resolveCustomer",authBoundary:"existing ingress",idempotency:"identity uniqueness/upsert",audit:"memory identity + episodes",retry:"caller/queue",permission:"customer identity only"},
  "agent-28":{status:"executing",workflow:"extractMemorySignals",authBoundary:"existing customer event",idempotency:"xtra_memory_jobs_processed",audit:"evidence episode + facts",retry:"MEMORY_JOBS retry",permission:"vehicle-interest facts only"},
  "agent-31":{status:"executing",workflow:"updateCareAutomation",authBoundary:"existing customer event",idempotency:"xtra_memory_jobs_processed",audit:"xtra_customer_care_audit",retry:"MEMORY_JOBS retry",permission:"only new -> contacting may auto-write; important stages require proposal"},
  "agent-33":{status:"executing",workflow:"careProposal",authBoundary:"existing customer event",idempotency:"pending proposal dedupe + memory job claim",audit:"evidence_episode_id + confidence + rationale",retry:"MEMORY_JOBS retry",permission:"proposal creation only; owner decides consequential stage"},
  "agent-34":{status:"executing",workflow:"customer care audit",authBoundary:"existing customer event",idempotency:"memory job claim",audit:"append-only care audit",retry:"MEMORY_JOBS retry",permission:"audit records only"}
};
const PROMOTION_REQUIREMENTS=["authenticated-or-bounded-ingress","idempotency","audit-evidence","retry-or-reconciliation","least-privilege"];
const KEYWORDS={
  intelligence:/trend|market|competitor|search|research|thị trường|xu hướng/i,
  content:/content|blog|seo|geo|caption|video|bài|nội dung/i,
  distribution:/publish|schedule|telegram|social|phân phối|đăng|lịch/i,
  crm:/lead|customer|phone|vehicle|follow.?up|crm|khách|số điện thoại|xe/i,
  reputation:/review|mention|sentiment|reputation|đánh giá|danh tiếng/i,
  analytics:/kpi|roi|conversion|analytics|attribution|hiệu quả|chuyển đổi/i,
  operations:/queue|failure|sla|media|deploy|release|vận hành|triển khai/i,
  governance:/permission|evidence|approval|brand|kill|quyền|bằng chứng|duyệt/i
};
export function agentFleet(){
  return {version:"1.2.0",agents:AGENTS.map(a=>({...a,execution:EXECUTION_PROFILES[a.id]||{status:a.mode==="read"?"read-only":a.mode==="draft"?"draft-only":"approval-bound"}})),departments:DEPARTMENTS,total:AGENTS.length,promoted:Object.keys(EXECUTION_PROFILES),promotionRequirements:PROMOTION_REQUIREMENTS,
    policy:{sourceOfTruth:"D1/live production",orchestrator:"agent-57",publicWrite:"approval-required",budgetChange:"owner-required",brandPromise:"owner-required",customerDelete:"owner-only",productionDeploy:"GitHub Actions -> Cloudflare API/SDK",killSwitch:"AI_AGENT_FLEET_ENABLED=0"}};
}
export function planAgentRun(input={}){
  const text=String(input?.task||input?.event||"").trim().slice(0,2000);
  if(!text)return {ok:false,error:"task_required"};
  const departments=Object.entries(KEYWORDS).filter(([,re])=>re.test(text)).map(([k])=>k);
  if(!departments.length)departments.push("governance");
  if(!departments.includes("governance"))departments.push("governance");
  const selected=AGENTS.filter(a=>departments.includes(a.department));
  const approvalRequired=selected.some(a=>a.mode==="approval"||a.mode==="control");
  return {ok:true,task:text,departments,agents:selected.map(a=>a.id),approvalRequired,
    pipeline:["collect","score","brief","draft","validate","approval-gate"],
    execution:selected.some(a=>EXECUTION_PROFILES[a.id])?"bounded-existing-workflows":"plan-only",
    executableAgents:selected.filter(a=>EXECUTION_PROFILES[a.id]).map(a=>a.id),
    reason:"Only explicitly promoted agents execute through existing bounded workflows; all other production mutations remain behind owner/API approval paths."};
}
export function fleetEnabled(env){return String(env?.AI_AGENT_FLEET_ENABLED??"1")!=="0";}
