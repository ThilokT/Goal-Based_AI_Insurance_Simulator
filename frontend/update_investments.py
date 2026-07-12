import os
import re

files_info = {
    "UlipGoalCard.tsx": "totalPremium",
    "ProtectNGainCard.tsx": "investablePremium * payFor",
    "SmartKidGoalCard.tsx": "totalPaid",
    "WishGoalCard.tsx": "totalInvested",
    "IProtectGoalCard.tsx": "totalInvested",
    "GiftProGoalCard.tsx": "totalInvestment",
    "GppFlexiGoalCard.tsx": "totalPaid"
}

dir_path = "src/components/timeline"

for filename, var_name in files_info.items():
    filepath = os.path.join(dir_path, filename)
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()
    
    # 1. Add import useAppStore if not present
    if "useAppStore" not in content:
        # Find the first import and add it after
        content = re.sub(r"(import .*? from '.*?')", r"\1\nimport { useAppStore } from '../../store'", content, count=1)
    
    # 2. Add useEffect if not imported
    if "useEffect" not in content:
        content = content.replace("import { useState", "import { useState, useEffect", 1)
        
    # 3. Add setCardInvestment hook inside component
    component_name = filename.replace(".tsx", "")
    func_pattern = f"export default function {component_name}" + r"\([^)]+\) {"
    
    # We'll use a regex to find the start of the component body
    match = re.search(r"export default function " + component_name + r"\s*\([^)]+\)\s*{", content)
    if not match:
        # try without default
        match = re.search(r"export function " + component_name + r"\s*\([^)]+\)\s*{", content)
        
    if match:
        insert_pos = match.end()
        hook_code = "\n  const setCardInvestment = useAppStore(state => state.setCardInvestment);\n"
        if "setCardInvestment" not in content:
            content = content[:insert_pos] + hook_code + content[insert_pos:]
            
    # 4. Add the useEffect to sync the value
    # We can inject it right before the return statement.
    # We find the last return statement before the end of the file.
    
    return_matches = list(re.finditer(r"^\s*return\s*\(", content, re.MULTILINE))
    if return_matches:
        last_return_pos = return_matches[-1].start()
        
        goal_id_var = "result?.goalId || goal?.id" # Handle different prop variations safely
        
        sync_code = f"""
  useEffect(() => {{
    if ({goal_id_var}) {{
      setCardInvestment({goal_id_var}, {var_name});
    }}
  }}, [{var_name}, {goal_id_var}, setCardInvestment]);
"""
        if "setCardInvestment(" not in content:
            content = content[:last_return_pos] + sync_code + content[last_return_pos:]
            
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)
        
print("Updated all files.")
