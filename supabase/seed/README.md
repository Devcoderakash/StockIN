# Supabase Seed Data

Production applications should never automatically inject mock/demo data.
To add business initializations or category defaults, add SQL statements in `supabase/seed/seed.sql` and run:

```bash
supabase db reset
```
