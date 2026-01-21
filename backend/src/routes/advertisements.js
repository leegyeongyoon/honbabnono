const express = require('express');
const { Advertisement } = require('../models');
const authenticateToken = require('../middleware/auth');
const { Op } = require('sequelize');
const { initializeS3Upload } = require('../../../server/config/s3Config');

const router = express.Router();

// S3 업로드 초기화
const { uploadToMemory, uploadToS3Direct } = initializeS3Upload();

// 공개 - 활성 광고 목록 조회 (홈 화면용)
router.get('/active', async (req, res) => {
  try {
    const { position = 'home_banner' } = req.query;
    const now = new Date();

    const advertisements = await Advertisement.findAll({
      where: {
        isActive: true,
        position: position,
        [Op.or]: [
          { startDate: null },
          { startDate: { [Op.lte]: now } }
        ],
        [Op.or]: [
          { endDate: null },
          { endDate: { [Op.gte]: now } }
        ]
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      attributes: [
        'id', 'title', 'description', 'imageUrl', 'linkUrl', 
        'useDetailPage', 'detailContent', 'businessName', 'contactInfo',
        'position', 'priority', 'createdAt'
      ]
    });

    // 노출 수 증가
    if (advertisements.length > 0) {
      const adIds = advertisements.map(ad => ad.id);
      await Advertisement.increment('viewCount', {
        where: { id: { [Op.in]: adIds } }
      });
    }

    res.json({
      success: true,
      data: advertisements
    });
  } catch (error) {
    console.error('활성 광고 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      error: '광고를 불러오는데 실패했습니다.' 
    });
  }
});

// 광고 클릭 카운트 증가
router.post('/:id/click', async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    await advertisement.increment('clickCount');

    res.json({
      success: true,
      message: '클릭이 기록되었습니다.'
    });
  } catch (error) {
    console.error('광고 클릭 기록 오류:', error);
    res.status(500).json({
      success: false,
      error: '클릭 기록에 실패했습니다.'
    });
  }
});

// 광고 디테일 조회 (공개 - 인증 불필요)
router.get('/detail/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id, {
      attributes: [
        'id', 'title', 'description', 'imageUrl', 'businessName', 
        'contactInfo', 'detailContent', 'useDetailPage', 'linkUrl',
        'createdAt'
      ]
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    // 조회수 증가
    await Advertisement.increment('viewCount', {
      where: { id: advertisement.id }
    });

    res.json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    console.error('광고 디테일 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 정보를 불러오는데 실패했습니다.'
    });
  }
});

// 관리자 전용 엔드포인트들
// 모든 광고 목록 조회 (관리자)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20, position, isActive } = req.query;
    const offset = (page - 1) * limit;

    const whereClause = {};
    if (position) whereClause.position = position;
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const advertisements = await Advertisement.findAndCountAll({
      where: whereClause,
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      success: true,
      data: advertisements.rows,
      pagination: {
        total: advertisements.count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(advertisements.count / limit)
      }
    });
  } catch (error) {
    console.error('광고 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 목록을 불러오는데 실패했습니다.'
    });
  }
});

// 광고 상세 조회 (관리자)
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    res.json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    console.error('광고 상세 조회 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 정보를 불러오는데 실패했습니다.'
    });
  }
});

// 광고 생성 (관리자) 
router.post('/', authenticateToken, uploadToMemory.single('image'), async (req, res) => {
  try {
    const {
      title,
      description,
      linkUrl,
      useDetailPage = true,
      detailContent,
      businessName,
      contactInfo,
      position = 'home_banner',
      isActive = true,
      startDate,
      endDate,
      priority = 0
    } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: '광고 제목은 필수입니다.'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '광고 이미지는 필수입니다.'
      });
    }

    // S3에 이미지 업로드
    const uploadResult = await uploadToS3Direct(req.file, 'advertisement');
    const imageUrl = uploadResult.location;

    const advertisement = await Advertisement.create({
      title,
      description,
      imageUrl,
      linkUrl,
      useDetailPage: useDetailPage === 'true' || useDetailPage === true,
      detailContent,
      businessName,
      contactInfo,
      position,
      isActive: isActive === 'true' || isActive === true,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      priority: parseInt(priority) || 0,
      createdBy: req.user.userId
    });

    res.status(201).json({
      success: true,
      message: '광고가 성공적으로 생성되었습니다.',
      data: advertisement
    });
  } catch (error) {
    console.error('광고 생성 오류:', error);
    
    // S3 업로드의 경우 별도 파일 삭제 불필요

    res.status(500).json({
      success: false,
      error: '광고 생성에 실패했습니다.'
    });
  }
});

// 광고 수정 (관리자)
router.put('/:id', authenticateToken, uploadToMemory.single('image'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      linkUrl,
      useDetailPage,
      detailContent,
      businessName,
      contactInfo,
      position,
      isActive,
      startDate,
      endDate,
      priority
    } = req.body;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (linkUrl !== undefined) updateData.linkUrl = linkUrl;
    if (useDetailPage !== undefined) updateData.useDetailPage = useDetailPage === 'true' || useDetailPage === true;
    if (detailContent !== undefined) updateData.detailContent = detailContent;
    if (businessName !== undefined) updateData.businessName = businessName;
    if (contactInfo !== undefined) updateData.contactInfo = contactInfo;
    if (position !== undefined) updateData.position = position;
    if (isActive !== undefined) updateData.isActive = isActive === 'true' || isActive === true;
    if (startDate !== undefined) updateData.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updateData.endDate = endDate ? new Date(endDate) : null;
    if (priority !== undefined) updateData.priority = parseInt(priority) || 0;

    // 새 이미지가 업로드된 경우
    if (req.file) {
      // S3에 이미지 업로드
      const uploadResult = await uploadToS3Direct(req.file, 'advertisement');
      updateData.imageUrl = uploadResult.location;
    }

    await advertisement.update(updateData);

    res.json({
      success: true,
      message: '광고가 성공적으로 수정되었습니다.',
      data: advertisement
    });
  } catch (error) {
    console.error('광고 수정 오류:', error);
    
    // S3 업로드의 경우 별도 파일 삭제 불필요

    res.status(500).json({
      success: false,
      error: '광고 수정에 실패했습니다.'
    });
  }
});

// 광고 삭제 (관리자)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    // 이미지 파일 삭제
    if (advertisement.imageUrl) {
      const filePath = path.join(process.cwd(), advertisement.imageUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await advertisement.destroy();

    res.json({
      success: true,
      message: '광고가 성공적으로 삭제되었습니다.'
    });
  } catch (error) {
    console.error('광고 삭제 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 삭제에 실패했습니다.'
    });
  }
});

// 광고 활성/비활성 토글 (관리자)
router.patch('/:id/toggle', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const advertisement = await Advertisement.findByPk(id);
    if (!advertisement) {
      return res.status(404).json({
        success: false,
        error: '광고를 찾을 수 없습니다.'
      });
    }

    await advertisement.update({
      isActive: !advertisement.isActive
    });

    res.json({
      success: true,
      message: `광고가 ${advertisement.isActive ? '활성화' : '비활성화'}되었습니다.`,
      data: { isActive: advertisement.isActive }
    });
  } catch (error) {
    console.error('광고 토글 오류:', error);
    res.status(500).json({
      success: false,
      error: '광고 상태 변경에 실패했습니다.'
    });
  }
});

module.exports = router;