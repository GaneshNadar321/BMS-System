# Database Migration Guide: SQLite to PostgreSQL (Vercel)

Your app is currently using SQLite for local development, but for Vercel production deployment, you need to migrate to PostgreSQL.

## 🎯 Quick Setup (Recommended)

### Step 1: Create Vercel Postgres Database

1. Go to your Vercel project dashboard
2. Navigate to **Storage** tab
3. Click **Create Database**
4. Select **Postgres**
5. Choose a region close to your users
6. Click **Create**

Vercel will automatically add these environment variables to your project:
- `POSTGRES_URL` - Connection pool URL
- `POSTGRES_URL_NON_POOLING` - Direct connection URL
- And several others...

### Step 2: Configure Environment Variables

In your Vercel project settings:

1. Go to **Settings** → **Environment Variables**
2. Add two variables:
   - `DATABASE_URL` = Copy value from `POSTGRES_URL`
   - `DIRECT_URL` = Copy value from `POSTGRES_URL_NON_POOLING`

### Step 3: Run Migration on Vercel

After setting up the database and environment variables:

```bash
# Commit the updated schema
git add prisma/schema.prisma .env.example DATABASE_MIGRATION.md
git commit -m "Migrate to PostgreSQL for Vercel deployment"
git push origin main
```

Vercel will automatically:
1. Detect the changes
2. Run `prisma generate` during build
3. Deploy your app with PostgreSQL

### Step 4: Initialize the Database

You have two options:

**Option A: Using Vercel CLI** (Recommended)
```bash
# Install Vercel CLI if you haven't
npm install -g vercel

# Pull environment variables
vercel env pull .env.local

# Run migration
npx prisma migrate dev --name init

# Or push schema directly
npx prisma db push
```

**Option B: Using Vercel Dashboard**
1. Go to your deployed project URL
2. The first time your app tries to access the database, Prisma will create tables automatically (with `prisma db push`)

---

## 🔧 Local Development Setup

To continue developing locally while using PostgreSQL:

### Option 1: Keep SQLite for Local Dev (Easiest)

Keep your local `.env` file as is:
```env
DATABASE_URL=file:./db/custom.db
```

This allows you to develop locally with SQLite while production uses PostgreSQL.

### Option 2: Use PostgreSQL Locally Too

1. **Install PostgreSQL** on your machine
   - Windows: Download from [postgresql.org](https://www.postgresql.org/download/windows/)
   - Or use Docker:
     ```bash
     docker run --name batterylab-postgres -e POSTGRES_PASSWORD=password -p 5432:5432 -d postgres
     ```

2. **Update your local `.env`**:
   ```env
   DATABASE_URL=postgresql://postgres:password@localhost:5432/batterylab
   DIRECT_URL=postgresql://postgres:password@localhost:5432/batterylab
   ```

3. **Create the database**:
   ```bash
   # If using installed PostgreSQL
   createdb batterylab

   # Or using psql
   psql -U postgres
   CREATE DATABASE batterylab;
   \q
   ```

4. **Run migrations**:
   ```bash
   npx prisma migrate dev --name init
   # or
   npx prisma db push
   ```

---

## 📊 Migrating Existing Data (If Needed)

If you have important data in your SQLite database that you want to migrate:

### Step 1: Export from SQLite
```bash
# Export data as SQL
sqlite3 db/custom.db .dump > data_export.sql
```

### Step 2: Clean and Convert
The SQL dump will need some modifications:
- Remove SQLite-specific commands
- Adjust data types if needed
- Handle any incompatibilities

### Step 3: Import to PostgreSQL
```bash
# Using Vercel CLI
vercel env pull .env.local

# Import (after connecting to your Postgres DB)
psql $DATABASE_URL -f data_export.sql
```

**Note:** For complex migrations, consider using tools like:
- [Prisma Studio](https://www.prisma.io/studio) for visual data management
- Custom migration scripts
- Database migration tools

---

## 🔄 Schema Changes vs Migrations

### `prisma db push` (Quick, for development)
- Fast prototyping
- Directly syncs schema without migration files
- **Recommended for initial Vercel setup**

```bash
npx prisma db push
```

### `prisma migrate` (Production-grade)
- Creates migration history
- Version control for schema changes
- Better for team collaboration

```bash
npx prisma migrate dev --name descriptive_name
npx prisma migrate deploy  # For production
```

---

## 🐛 Troubleshooting

### Build Error: "Can't reach database server"
- **Solution**: Make sure `DATABASE_URL` and `DIRECT_URL` are set in Vercel environment variables
- Check that your Postgres database is created and running

### Error: "Invalid DATABASE_URL"
- **Solution**: Ensure the URL format is correct:
  ```
  postgresql://user:password@host:port/database?sslmode=require
  ```

### Error: "Prisma Client not generated"
- **Solution**: The build script now includes `prisma generate`
- If still failing, add a `postinstall` script:
  ```json
  "postinstall": "prisma generate"
  ```

### Migration conflicts
- **Solution**: If you get migration conflicts, you can reset:
  ```bash
  npx prisma migrate reset
  npx prisma db push
  ```

### Local dev works but Vercel fails
- **Solution**: Check environment variables in Vercel are set correctly
- Ensure connection pooling is enabled (use `POSTGRES_URL`, not `POSTGRES_URL_NON_POOLING` for `DATABASE_URL`)

---

## 📚 Key Differences: SQLite vs PostgreSQL

| Feature | SQLite | PostgreSQL |
|---------|--------|------------|
| File-based | ✅ Yes (./db/custom.db) | ❌ No (Client-Server) |
| Vercel Compatible | ❌ No (read-only filesystem) | ✅ Yes |
| Connection Pooling | ❌ No | ✅ Yes |
| Concurrent Writes | ⚠️ Limited | ✅ Excellent |
| Data Types | Fewer types | More types |
| Auto-increment | `autoincrement` | `serial` / `identity` |

---

## ✅ Checklist

- [ ] Prisma schema updated to PostgreSQL
- [ ] Created Vercel Postgres database
- [ ] Set `DATABASE_URL` in Vercel environment variables
- [ ] Set `DIRECT_URL` in Vercel environment variables
- [ ] Committed and pushed changes
- [ ] Database schema initialized (`prisma db push` or `prisma migrate`)
- [ ] Tested app on Vercel
- [ ] (Optional) Local PostgreSQL set up
- [ ] (Optional) Data migrated from SQLite

---

## 🚀 Quick Commands Reference

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database (no migration files)
npx prisma db push

# Create and apply migration
npx prisma migrate dev --name init

# Deploy migrations to production
npx prisma migrate deploy

# Open Prisma Studio (visual editor)
npx prisma studio

# Reset database (caution: deletes all data)
npx prisma migrate reset

# Pull environment variables from Vercel
vercel env pull .env.local

# Deploy to Vercel
vercel --prod
```

---

## 📖 Additional Resources

- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [Vercel Postgres Documentation](https://vercel.com/docs/storage/vercel-postgres)
- [Prisma Migrate Documentation](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [PostgreSQL Connection Pooling](https://www.prisma.io/docs/guides/performance-and-optimization/connection-management)

---

Need help? Check the troubleshooting section or refer to the deployment documentation.
