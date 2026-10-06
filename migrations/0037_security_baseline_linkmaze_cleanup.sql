-- Remove the initial baseline sample polluted by Cloudflare crawler-protection link-maze injections.
-- These events remain visible in raw Security Events evidence but are not actionable WAF attack counts.
DELETE FROM security_telemetry_samples
WHERE waf_top_source = 'linkMaze'
  AND waf_top_action = 'link_maze_injected';
