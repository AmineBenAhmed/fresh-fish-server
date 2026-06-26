import { Router } from 'express'
import multer from 'multer'
import cloudinary from '../config/cloudinary'
import { authenticate } from '../middleware/auth'

const uploadRouter = Router()

const upload = multer({ storage: multer.memoryStorage() })

uploadRouter.post('/image', authenticate, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    }

    const b64 = req.file.buffer.toString('base64')
    const dataUri = `data:${req.file.mimetype};base64,${b64}`

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'grocery-delivery',
    })

    res.json({ url: result.secure_url })
  } catch (err: any) {
    console.error('Upload error:', err)
    res.status(500).json({ error: err.message || 'Upload failed' })
  }
})

export default uploadRouter
