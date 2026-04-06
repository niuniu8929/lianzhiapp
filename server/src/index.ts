import express from "express";
import cors from "cors";
import multer from "multer";
import { S3Storage } from "coze-coding-dev-sdk";

const app = express();
const port = process.env.PORT || 9091;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// 初始化对象存储
const storage = new S3Storage({
  endpointUrl: process.env.COZE_BUCKET_ENDPOINT_URL,
  accessKey: "",
  secretKey: "",
  bucketName: process.env.COZE_BUCKET_NAME,
  region: "cn-beijing",
});

// 配置 multer 用于接收文件
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 限制 50MB
});

// 健康检查
app.get('/api/v1/health', (req, res) => {
  console.log('Health check success');
  res.status(200).json({ status: 'ok' });
});

/**
 * 上传单个文件
 * 返回对象存储的 key 和签名 URL
 */
app.post('/api/v1/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未提供文件' });
    }

    const { buffer, originalname, mimetype } = req.file;

    // 上传到对象存储
    const fileKey = await storage.uploadFile({
      fileContent: buffer,
      fileName: `delivery-images/${Date.now()}_${originalname}`,
      contentType: mimetype,
    });

    // 生成签名 URL（有效期 30 天）
    const signedUrl = await storage.generatePresignedUrl({
      key: fileKey,
      expireTime: 2592000, // 30 天
    });

    res.json({
      success: true,
      key: fileKey,
      url: signedUrl,
    });
  } catch (error) {
    console.error('上传文件失败:', error);
    res.status(500).json({ error: '上传文件失败' });
  }
});

/**
 * 批量上传文件
 */
app.post('/api/v1/upload/batch', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      return res.status(400).json({ error: '未提供文件' });
    }

    const results = [];

    for (const file of req.files) {
      const { buffer, originalname, mimetype } = file;

      // 上传到对象存储
      const fileKey = await storage.uploadFile({
        fileContent: buffer,
        fileName: `delivery-images/${Date.now()}_${originalname}`,
        contentType: mimetype,
      });

      // 生成签名 URL
      const signedUrl = await storage.generatePresignedUrl({
        key: fileKey,
        expireTime: 2592000,
      });

      results.push({
        key: fileKey,
        url: signedUrl,
      });
    }

    res.json({
      success: true,
      files: results,
    });
  } catch (error) {
    console.error('批量上传文件失败:', error);
    res.status(500).json({ error: '批量上传文件失败' });
  }
});

/**
 * 根据 key 获取文件签名 URL
 */
app.post('/api/v1/file/url', async (req, res) => {
  try {
    const { keys } = req.body;

    if (!keys || !Array.isArray(keys) || keys.length === 0) {
      return res.status(400).json({ error: '未提供文件 key' });
    }

    const urls = await Promise.all(
      keys.map(async (key: string) => {
        const url = await storage.generatePresignedUrl({
          key,
          expireTime: 2592000, // 30 天
        });
        return { key, url };
      })
    );

    res.json({
      success: true,
      urls,
    });
  } catch (error) {
    console.error('获取文件 URL 失败:', error);
    res.status(500).json({ error: '获取文件 URL 失败' });
  }
});

// 错误处理中间件
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '文件大小超过限制（最大 50MB）' });
  }
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
