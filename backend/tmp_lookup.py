import asyncio, os, re
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'test_database'
from database import db

async def main():
    # Find exact matches for the schools we need
    searches = [
        'University of Texas at Austin',
        'University of Michigan',
        'University of Southern California',
        'University of Minnesota',
        'Purdue University',
    ]
    for s in searches:
        kb = await db.university_knowledge_base.find_one(
            {'university_name': re.compile(f'^{re.escape(s)}', re.IGNORECASE)},
            {'_id': 0, 'university_name': 1, 'division': 1, 'conference': 1, 'region': 1, 'domain': 1, 'primary_coach': 1, 'coach_email': 1}
        )
        if kb:
            print(f'FOUND: {kb}')
        else:
            # try partial
            kb = await db.university_knowledge_base.find_one(
                {'university_name': re.compile(s.split()[0] + '.*' + s.split()[-1], re.IGNORECASE)},
                {'_id': 0, 'university_name': 1, 'division': 1, 'conference': 1, 'region': 1, 'domain': 1}
            )
            print(f'PARTIAL: {kb}')

asyncio.run(main())
