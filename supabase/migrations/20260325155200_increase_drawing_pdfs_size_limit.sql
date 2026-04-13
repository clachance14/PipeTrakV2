-- Increase drawing-pdfs bucket file size limit from 50MB to 150MB
UPDATE storage.buckets
SET file_size_limit = 157286400 -- 150MB (150 * 1024 * 1024)
WHERE id = 'drawing-pdfs';
