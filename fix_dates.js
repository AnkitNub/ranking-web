const fs = require('fs');

const helper = 
// Helper to safely parse UTC dates from Supabase without time zone
function parseUTC(dateString) {
  if (!dateString) return new Date();
  return new Date(dateString + (dateString.includes('Z') || dateString.includes('+') ? '' : 'Z'));
}
;

function processFile(filePath, injectionTarget, injectionReplace) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('parseUTC')) {
      content = content.replace(/new Date\(event\.created_at\)/g, 'parseUTC(event.created_at)');
      content = content.replace(injectionTarget, injectionReplace);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed ' + filePath);
    } else {
      console.log('Already fixed ' + filePath);
    }
  } catch (err) {
    console.error('Error in ' + filePath, err);
  }
}

// Fix page.js
processFile(
  'app/admin/page.js',
  'function isExpired(event) {\n  if (!event || !event.created_at) return false;\n\n  // Event finishes 24 hours from its created time\n  const finishTime = new Date(event.created_at);',
  helper + '\nfunction isExpired(event) {\n  if (!event || !event.created_at) return false;\n\n  const createdStr = event.created_at;\n  const utcDate = new Date(createdStr + (createdStr.includes(\'Z\') || createdStr.includes(\'+\') ? \'\' : \'Z\'));\n\n  // Event finishes 24 hours from its created time\n  const finishTime = new Date(utcDate);'
);

// Fix events/[id]/page.js
processFile(
  'app/admin/events/[id]/page.js',
  'import supabase from \'@/lib/supabaseClient\';\n\n/* --- Score Details Modal',
  'import supabase from \'@/lib/supabaseClient\';\n' + helper + '\n/* --- Score Details Modal'
);
