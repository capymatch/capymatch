import asyncio, os, re
os.environ['MONGO_URL'] = 'mongodb://localhost:27017'
os.environ['DB_NAME'] = 'test_database'
from database import db

async def main():
    note = await db.notes.find_one({}, {'_id': 0})
    if note:
        print('NOTES SCHEMA:')
        for k,v in note.items():
            print(f'  {k}: {type(v).__name__} = {repr(v)[:100]}')

    ev = await db.events.find_one({}, {'_id': 0})
    if ev:
        print('\nEVENTS SCHEMA:')
        for k,v in ev.items():
            print(f'  {k}: {type(v).__name__} = {repr(v)[:100]}')

    schools = ['Stanford', 'Texas', 'UCLA', 'Michigan', 'Duke', 'Florida State', 'Ohio State', 'Penn State', 'USC', 'Baylor']
    for s in schools:
        kb = await db.university_knowledge_base.find_one(
            {'university_name': re.compile(s, re.IGNORECASE)},
            {'_id': 0, 'university_name': 1, 'division': 1, 'conference': 1, 'region': 1, 'domain': 1, 'primary_coach': 1, 'coach_email': 1}
        )
        if kb:
            print(f'{s}: {kb}')
        else:
            print(f'{s}: NOT FOUND')

asyncio.run(main())
