export const botDefaults=[
  {seed_key:'known-crawlers',rule_type:'user_agent',value:'googlebot|bingbot|yandexbot|baiduspider|duckduckbot|bytespider|gptbot|claudebot|applebot|petalbot|ahrefsbot|semrushbot',notes:'Known crawler UA substrings (pipe-separated)'},
  {seed_key:'link-scanners',rule_type:'user_agent',value:'facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|linkedinbot|pinterestbot|skypeuripreview|google-inspectiontool|proofpoint|urlscan',notes:'Known automated previews and link scanners'},
  {seed_key:'headless-ua',rule_type:'user_agent',value:'headlesschrome|phantomjs|selenium|playwright|puppeteer',notes:'Explicit headless/automation UA evidence'},
  {seed_key:'webdriver',rule_type:'automated_pattern',value:'webdriver',notes:'Browser reports navigator.webdriver=true'},
  {seed_key:'frequency',rule_type:'automated_pattern',value:'frequency:120',notes:'At least 120 analytics requests per browser identity in 60 seconds; IP fallback only without identity'},
  {seed_key:'automated-referrer',rule_type:'domain',value:'urlscan.io',notes:'Known automated inspection referrer'}
].map(r=>({...r,traffic_class:'bot',enabled:true,is_system:false}));
export function matchesAutomation(rule,context){
  if(rule.rule_type==='user_agent')return String(rule.value).toLowerCase().split('|').filter(Boolean).some(v=>String(context.user_agent||'').toLowerCase().includes(v.trim()));
  if(rule.rule_type==='browser_identity')return String(context.anonymous_id||context.installation_id||'')===String(rule.value);
  if(rule.rule_type==='automated_pattern')return rule.value==='webdriver'?context.webdriver===true:rule.value.startsWith('frequency:')&&Number(context.request_count_60s||0)>=Number(rule.value.split(':')[1]);
  return false;
}