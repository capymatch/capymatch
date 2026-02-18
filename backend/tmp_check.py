import asyncio, os
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'test_database'
from database import db

async def main():
    user = await db.users.find_one({'email': 'douglas@yeslms.com'}, {'_id': 0})
    uid = user['user_id']
    print('User keys:', list(user.keys()))
    print('user_id:', uid)
    print('questionnaire_completed:', user.get('questionnaire_completed'))
    print('onboarding_completed:', user.get('onboarding_completed'))
    
    tenant = await db.tenants.find_one({'owner_user_id': uid}, {'_id': 0, 'tenant_id': 1})
    print('Tenant:', tenant)
    tid = tenant['tenant_id'] if tenant else None
    
    if tid:
        programs = await db.programs.find({'tenant_id': tid}, {'_id': 0, 'university_name': 1, 'program_id': 1}).to_list(50)
        print(f'\nPrograms ({len(programs)}):')
        for p in programs:
            print(f'  - {p["university_name"]} ({p["program_id"]})')

asyncio.run(main())
