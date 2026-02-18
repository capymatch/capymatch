import asyncio, os
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'test_database'
from database import db

async def main():
    uid = 'user_02cfb4bd2d19'
    tid = 'tenant_e724b777ce6e'
    
    # 1. Delete programs for this tenant
    result = await db.programs.delete_many({'tenant_id': tid})
    print(f'Deleted {result.deleted_count} programs')
    
    # 2. Reset questionnaire/onboarding flags
    result = await db.users.update_one(
        {'user_id': uid},
        {'$unset': {'questionnaire_completed': '', 'onboarding_completed': ''}}
    )
    print(f'Reset user flags: modified={result.modified_count}')
    
    # 3. Also reset recruiting profile questionnaire_completed
    result = await db.recruiting_profiles.update_one(
        {'user_id': uid},
        {'$unset': {'questionnaire_completed': ''}}
    )
    print(f'Reset profile questionnaire: modified={result.modified_count}')
    
    # Verify
    user = await db.users.find_one({'user_id': uid}, {'_id': 0, 'questionnaire_completed': 1, 'onboarding_completed': 1})
    programs = await db.programs.find({'tenant_id': tid}).to_list(50)
    print(f'\nVerification - User flags: {user}, Programs remaining: {len(programs)}')

asyncio.run(main())
