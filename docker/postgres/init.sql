-- สร้าง role ของแอปตั้งแต่ init — ต้องไม่ใช่เจ้าของตาราง เพื่อให้ RLS มีผล
-- (สคริปต์ manual 001 จะ GRANT สิทธิ์หลังมีตารางแล้ว)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    CREATE ROLE app_user LOGIN PASSWORD 'app_user_dev';
  END IF;
END $$;

GRANT CONNECT ON DATABASE petcare TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
