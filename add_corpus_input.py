import os
import re

files = [
    "UlipGoalCard.tsx",
    "ProtectNGainCard.tsx",
    "SmartKidGoalCard.tsx",
    "WishGoalCard.tsx",
    "IProtectGoalCard.tsx",
    "GiftProGoalCard.tsx",
    "GppFlexiGoalCard.tsx"
]

dir_path = "frontend/src/components/timeline"

ui_block = """
            {/* Corpus Needed Input */}
            <div className="bg-orange-50/40 p-3 rounded-lg border border-orange-100 mb-5 mx-4 mt-4 flex justify-between items-center sm:mx-5">
              <label className="text-xs font-bold text-gray-700">Corpus Needed / Target Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">₹</span>
                <input 
                  type="number" 
                  value={(globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWhatIfParams({
                      ...globalWhatIfParams,
                      goalTargetAmounts: {
                        ...(globalWhatIfParams?.goalTargetAmounts || {}),
                        [result?.goalId || goal?.id]: val
                      }
                    });
                  }}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-800 w-32 outline-none"
                />
              </div>
            </div>
"""

ui_block_no_margin = """
            {/* Corpus Needed Input */}
            <div className="bg-orange-50/40 p-3 rounded-lg border border-orange-100 mb-5 flex justify-between items-center">
              <label className="text-xs font-bold text-gray-700">Corpus Needed / Target Amount</label>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">₹</span>
                <input 
                  type="number" 
                  value={(globalWhatIfParams?.goalTargetAmounts && globalWhatIfParams.goalTargetAmounts[result?.goalId || goal?.id]) || goal?.corpusNeeded || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setWhatIfParams({
                      ...globalWhatIfParams,
                      goalTargetAmounts: {
                        ...(globalWhatIfParams?.goalTargetAmounts || {}),
                        [result?.goalId || goal?.id]: val
                      }
                    });
                  }}
                  className="bg-white border border-gray-300 rounded px-2 py-1 text-sm font-bold text-gray-800 w-32 outline-none"
                />
              </div>
            </div>
"""

for filename in files:
    filepath = os.path.join(dir_path, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 1. Add hook to extract state if not present
    component_name = filename.replace(".tsx", "")
    match = re.search(r"export default function " + component_name + r"\s*\([^)]+\)\s*{", content)
    if not match:
        match = re.search(r"export function " + component_name + r"\s*\([^)]+\)\s*{", content)
        
    if match:
        insert_pos = match.end()
        hook_code = "\n  const setWhatIfParams = useAppStore(state => state.setWhatIfParams);\n  const globalWhatIfParams = useAppStore(state => state.whatIfParams);\n"
        if "const setWhatIfParams = useAppStore" not in content:
            content = content[:insert_pos] + hook_code + content[insert_pos:]

    # 2. Insert the UI block right after the header block.
    # We will use simple search and replace for each file's specific header structure to be safe.
    
    if filename == "UlipGoalCard.tsx":
        target = "</div>\n          </div>\n\n          <div className=\"flex flex-col md:flex-col\">"
        replacement = "</div>\n          </div>\n" + ui_block + "\n          <div className=\"flex flex-col md:flex-col\">"
        content = content.replace(target, replacement)
        
    elif filename in ["WishGoalCard.tsx", "SmartKidGoalCard.tsx", "ProtectNGainCard.tsx", "IProtectGoalCard.tsx", "GiftProGoalCard.tsx", "GppFlexiGoalCard.tsx"]:
        # Most of these have:
        #               </div>
        #             </div>
        # followed by either `{/* Top Section` or `{/* Input Section` or `{/* Red Bordered Box`
        # They all share a pattern of closing the header with </div>\n            </div>
        
        # Let's find the closing of the header which usually ends with the icon
        #               {goal?.icon ?? '❤️'}
        #             </div>
        #           </div>
        
        match_header = re.search(r"(<div[^>]*>\s*\{goal(?:\?)?\.icon[^}]*\}\s*</div>\s*</div>)", content)
        if match_header:
            if "Corpus Needed / Target Amount" not in content:
                end_idx = match_header.end()
                content = content[:end_idx] + "\n" + ui_block_no_margin + content[end_idx:]

    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

print("Added Corpus Needed input to all files.")
