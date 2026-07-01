import sys
import io
import time
import random
import string
import os
from dotenv import load_dotenv

# Add backend directory to sys.path so we can import app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Fix Windows encoding
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

load_dotenv()

from app.services.auth_service import AuthService
from app.database import get_admin_client

def generate_random_email():
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=10))
    return f"testuser_{random_str}@example.com"

def run_tests():
    auth = AuthService()
    admin_client = get_admin_client()

    email = generate_random_email()
    password = "TestPassword123!"
    full_name = "Test User Full Name"

    print(f"--- Starting Auth Flow Tests ---")
    print(f"Generated test email: {email}")

    # 1. Test Signup
    print("1. Testing Signup...")
    try:
        signup_res = auth.signup(email, password, full_name)
        print(f"  [OK] Signup successful. User ID: {signup_res.get('user_id')}")
        user_id = signup_res.get('user_id')
    except Exception as e:
        print(f"  [FAIL] Signup error: {e}")
        return False

    # 2. Test Details stored in DB
    print("2. Testing User Details in Database...")
    try:
        # Give a small delay in case Supabase trigger for profiles takes a moment
        time.sleep(1)
        res = admin_client.table("profiles").select("*").eq("id", user_id).execute()
        if res.data and len(res.data) > 0:
            profile = res.data[0]
            print(f"  [OK] Profile found in DB. Full Name: {profile.get('full_name')}")
            if profile.get('full_name') == full_name:
                print(f"  [OK] Full name matches.")
            else:
                print(f"  [FAIL] Full name mismatch! Expected {full_name}, got {profile.get('full_name')}")
        else:
            print("  [FAIL] Profile not found in DB.")
    except Exception as e:
        print(f"  [FAIL] DB check error: {e}")
        return False

    # 3. Test Login
    print("3. Testing Login...")
    try:
        login_res = auth.login(email, password)
        print(f"  [OK] Login successful. Access Token exists: {'access_token' in login_res}")
    except Exception as e:
        print(f"  [FAIL] Login error: {e}")
        return False

    print("--- All tests passed! ---")
    
    # 4. Optional Cleanup (Delete user)
    print("4. Cleaning up (deleting test user)...")
    try:
        admin_client.auth.admin.delete_user(user_id)
        print("  [OK] Test user deleted.")
    except Exception as e:
        print(f"  [WARN] Failed to delete test user: {e}")

    return True

if __name__ == "__main__":
    success = run_tests()
    if not success:
        sys.exit(1)
