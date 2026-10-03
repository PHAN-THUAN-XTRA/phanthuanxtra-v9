import json, os, sys
from pathlib import Path
from headroom import CompressConfig, compress

src=Path("tests/fixtures/headroom-safe-context.json")
data=json.loads(src.read_text(encoding="utf-8"))
raw=json.dumps(data,ensure_ascii=False,indent=2)
messages=[{"role":"user","content":"Audit this vehicle-management context. Preserve IDs, policy markers, status, price and model."},{"role":"tool","tool_call_id":"vehicle_fixture","content":raw}]
cfg=CompressConfig(compress_user_messages=False,protect_recent=0,min_tokens_to_compress=1)
result=compress(messages,model="gpt-4o",config=cfg)
out=json.dumps(result.messages,ensure_ascii=False)
missing=[x for x in data["required_literals"] if x not in out]
report={
 "tokens_before":result.tokens_before,
 "tokens_after":result.tokens_after,
 "tokens_saved":result.tokens_saved,
 "compression_ratio":result.compression_ratio,
 "transforms":result.transforms_applied,
 "required_literals":len(data["required_literals"]),
 "missing_literals":missing,
 "pass_semantics":not missing,
}
Path("headroom-shadow-report.json").write_text(json.dumps(report,indent=2),encoding="utf-8")
print(json.dumps(report))
if missing:
 print("Semantic preservation failed: "+", ".join(missing),file=sys.stderr)
 sys.exit(2)
