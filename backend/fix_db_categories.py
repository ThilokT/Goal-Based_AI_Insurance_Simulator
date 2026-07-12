import asyncio
import sys
import json
sys.path.insert(0, ".")

from app.services.product_service import ProductService

async def main():
    service = ProductService()
    res = service.list_products(limit=100)
    
    updates = []
    for p in res['products']:
        pid = p['product_id']
        category = p['category']
        is_active = p.get('is_active', True)
        
        if pid == 'ICICI_Pru_GIFT_Pro_Brochure':
            category = 'non-participating'
        elif pid == 'ICICI Pru iProtect Smart':
            category = 'protection'
        elif pid == 'ICICI-Pru-Smart-Kid-360-Brochure':
            category = 'ulip'
        elif pid == 'ICICI_Pru_Protect_N_Gain_Brochure':
            category = 'ulip'
        elif pid == 'ICICI-Pru-Wish-Brochure':
            category = 'protection'
        elif pid == 'ICICI_Pru_GPP_Flexi_Brochure':
            category = 'annuity'
        elif pid == 'ICICI_Pru_Signature_Assure_Brochure':
            category = 'ulip'
        elif pid == 'IPru-Signature-Online-Brochure':
            # This is an 8th product, we want only 7
            is_active = False
            
        p['category'] = category
        p['is_active'] = is_active
        updates.append(p)
        
    # bulk upsert
    service.bulk_upsert(updates)
    print("Categories fixed in database!")
    
if __name__ == "__main__":
    asyncio.run(main())
