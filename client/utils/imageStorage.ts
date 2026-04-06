/**
 * 本地图片存储工具
 * 用于将拍照/选择的图片保存到本地持久化目录
 */
import { Paths, File, Directory } from 'expo-file-system';
import { generateUUID } from './helpers';

/**
 * 保存图片到本地持久化目录
 * @param uri 临时图片 URI（来自相机或相册）
 * @returns 持久化的本地 URI
 */
export async function saveImageLocally(uri: string): Promise<string> {
  try {
    // 获取 document 目录
    const docDir = Paths.document;
    
    // 创建 images 子目录
    const imagesDir = new Directory(docDir, 'images');
    if (!imagesDir.exists) {
      await imagesDir.create();
    }

    // 生成唯一文件名
    const fileExt = uri.split('.').pop() || 'jpg';
    const fileName = `img_${Date.now()}_${generateUUID().slice(0, 8)}.${fileExt}`;
    
    // 创建目标文件
    const destFile = new File(imagesDir, fileName);

    // 读取源文件并写入目标
    const sourceFile = new File(uri);
    if (sourceFile.exists) {
      const data = await sourceFile.bytes();
      await destFile.write(data);
    } else {
      // 如果 File 构造函数无法处理 uri，尝试使用 base64
      throw new Error('源文件不存在');
    }

    console.log('图片已保存到本地:', destFile.uri);
    return destFile.uri;
  } catch (error) {
    console.error('保存图片失败:', error);
    // 返回原始 uri 作为后备
    return uri;
  }
}

/**
 * 批量保存图片到本地
 * @param uris 临时图片 URI 数组
 * @returns 持久化的本地 URI 数组
 */
export async function saveImagesLocally(uris: string[]): Promise<string[]> {
  const savedUris: string[] = [];
  for (const uri of uris) {
    try {
      const savedUri = await saveImageLocally(uri);
      savedUris.push(savedUri);
    } catch (error) {
      console.error('保存图片失败:', uri, error);
      // 使用原始 uri 作为后备
      savedUris.push(uri);
    }
  }
  return savedUris;
}

/**
 * 删除本地图片
 * @param uri 本地图片 URI
 */
export async function deleteLocalImage(uri: string): Promise<void> {
  try {
    const file = new File(uri);
    if (file.exists) {
      await file.delete();
      console.log('已删除本地图片:', uri);
    }
  } catch (error) {
    console.error('删除本地图片失败:', error);
  }
}

/**
 * 检查 URI 是否是本地存储的图片
 */
export function isLocalImage(uri: string): boolean {
  try {
    const docDir = Paths.document;
    return uri.startsWith(docDir.uri) || uri.startsWith('file://');
  } catch {
    return uri.startsWith('file://');
  }
}
