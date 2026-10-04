import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,existsSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';

test('executor summary treats shell metacharacters in dispatch inputs as literal data',()=>{
  const workflow=readFileSync(new URL('../.github/workflows/ai-peer-executor.yml',import.meta.url),'utf8');
  const step=workflow.split('      - name: Executor summary\n')[1];
  assert.ok(step);
  const script=step.split('        run: |\n')[1].split('\n').map(line=>line.replace(/^          /,'')).join('\n');
  assert.doesNotMatch(script,/\$\{\{\s*inputs\./);
  const dir=mkdtempSync(join(tmpdir(),'ptx-shell-input-'));
  try {
    const task='$(touch task-marker)';
    const branch='feature/`touch branch-marker`"; touch quote-marker; #\nsecond line';
    const summary=join(dir,'summary.txt');
    const r=spawnSync('bash',['-e','-c',script],{cwd:dir,env:{PATH:process.env.PATH,TASK_ID:task,BASE_BRANCH:branch,GITHUB_STEP_SUMMARY:summary},encoding:'utf8'});
    assert.equal(r.status,0,r.stderr);
    for(const marker of ['task-marker','branch-marker','quote-marker'])assert.equal(existsSync(join(dir,marker)),false);
    const output=readFileSync(summary,'utf8');
    assert.ok(output.includes('task_id='+task));assert.ok(output.includes('base_branch='+branch));
  } finally {rmSync(dir,{recursive:true,force:true});}
});
