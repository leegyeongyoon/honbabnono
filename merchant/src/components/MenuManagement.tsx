import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  SelectChangeEvent,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  RadioGroup,
  Radio,
  InputAdornment,
  LinearProgress,
  Snackbar,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category,
  PhotoCamera,
  TuneRounded,
  CheckCircle,
  ExpandMore,
  AddCircleOutline,
} from '@mui/icons-material';
import apiClient from '../utils/api';

// ── Types ──────────────────────────────────────────────────────
interface MenuCategory {
  id: number;
  name: string;
  sort_order?: number;
}

interface MenuItemData {
  id: number;
  name: string;
  description?: string;
  price: number;
  prep_time_min?: number;
  is_set_menu: boolean;
  serves?: number;
  category_id?: number;
  category_name?: string;
  is_active: boolean;
}

interface OptionItemData {
  id?: string;
  name: string;
  additional_price: number;
  is_active: boolean;
  sort_order: number;
}

interface OptionGroupData {
  id?: string;
  menu_id?: string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  sort_order: number;
  items: OptionItemData[];
}

interface MenuForm {
  name: string;
  description: string;
  price: string;
  prep_time_min: string;
  is_set_menu: boolean;
  serves: string;
  category_id: string;
}

// AI 분석에서 카테고리 기본 순서
const DEFAULT_AI_CATEGORIES = ['메인', '사이드', '음료', '주류', '디저트'];

const EMPTY_FORM: MenuForm = {
  name: '',
  description: '',
  price: '',
  prep_time_min: '',
  is_set_menu: false,
  serves: '',
  category_id: '',
};

// ── Style constants ────────────────────────────────────────────
const BRAND = '#C4A08A';
const BRAND_DARK = '#A88068';
const BRAND_LIGHT = '#FAF6F3';

// ── Component ──────────────────────────────────────────────────
const MenuManagement: React.FC = () => {
  const merchantData = JSON.parse(localStorage.getItem('merchantData') || '{}');
  const restaurantId = merchantData.restaurant_id || merchantData.id;

  const [menus, setMenus] = useState<MenuItemData[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Menu dialog
  const [menuDialogOpen, setMenuDialogOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<MenuItemData | null>(null);
  const [form, setForm] = useState<MenuForm>(EMPTY_FORM);

  // Category dialog
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catName, setCatName] = useState('');
  const [editingCat, setEditingCat] = useState<MenuCategory | null>(null);

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<MenuItemData | null>(null);

  // AI menu analysis
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResults, setAiResults] = useState<Array<{ name: string; price: number; description: string; category: string; selected: boolean }>>([]);
  const [aiError, setAiError] = useState('');
  const [aiSaving, setAiSaving] = useState(false);

  // Option groups (in menu edit dialog)
  const [optionGroups, setOptionGroups] = useState<OptionGroupData[]>([]);
  const [optionGroupsLoading, setOptionGroupsLoading] = useState(false);

  // Bulk price adjust
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkType, setBulkType] = useState<'fixed' | 'percent'>('fixed');
  const [bulkAmount, setBulkAmount] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });

  // ── Fetch ──
  const fetchMenus = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/api/menus/restaurant/${restaurantId}`);
      const d = res.data.data || res.data;
      setMenus(d.menus ?? d.categories?.flatMap((c: any) => c.menus || []) ?? (Array.isArray(d) ? d : []));
    } catch (err: any) {
      setError(err.response?.data?.message || '메뉴를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  const fetchCategories = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const res = await apiClient.get(`/api/menus/categories/${restaurantId}`);
      const d = res.data.data || res.data;
      setCategories(Array.isArray(d) ? d : d.categories ?? []);
    } catch {
      // silent — categories may be empty
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenus();
    fetchCategories();
  }, [fetchMenus, fetchCategories]);

  // ── Option Groups ──
  const fetchOptionGroups = useCallback(async (menuId: number) => {
    setOptionGroupsLoading(true);
    try {
      const res = await apiClient.get(`/api/menus/${menuId}/options`);
      const d = res.data.data || res.data;
      setOptionGroups(Array.isArray(d) ? d : []);
    } catch {
      setOptionGroups([]);
    } finally {
      setOptionGroupsLoading(false);
    }
  }, []);

  const handleAddOptionGroup = () => {
    setOptionGroups((prev) => [
      ...prev,
      {
        name: '',
        is_required: false,
        min_select: 0,
        max_select: 1,
        sort_order: prev.length,
        items: [],
      },
    ]);
  };

  const handleOptionGroupChange = (groupIdx: number, field: string, value: string | boolean | number) => {
    setOptionGroups((prev) =>
      prev.map((g, i) => (i === groupIdx ? { ...g, [field]: value } : g))
    );
  };

  const handleRemoveOptionGroup = (groupIdx: number) => {
    setOptionGroups((prev) => prev.filter((_, i) => i !== groupIdx));
  };

  const handleAddOptionItem = (groupIdx: number) => {
    setOptionGroups((prev) =>
      prev.map((g, i) =>
        i === groupIdx
          ? { ...g, items: [...g.items, { name: '', additional_price: 0, is_active: true, sort_order: g.items.length }] }
          : g
      )
    );
  };

  const handleOptionItemChange = (groupIdx: number, itemIdx: number, field: string, value: string | number | boolean) => {
    setOptionGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? {
              ...g,
              items: g.items.map((item, ii) =>
                ii === itemIdx ? { ...item, [field]: value } : item
              ),
            }
          : g
      )
    );
  };

  const handleRemoveOptionItem = (groupIdx: number, itemIdx: number) => {
    setOptionGroups((prev) =>
      prev.map((g, gi) =>
        gi === groupIdx
          ? { ...g, items: g.items.filter((_, ii) => ii !== itemIdx) }
          : g
      )
    );
  };

  // ── Menu CRUD ──
  const openAddMenu = () => {
    setEditingMenu(null);
    setForm(EMPTY_FORM);
    setOptionGroups([]);
    setMenuDialogOpen(true);
  };

  const openEditMenu = (item: MenuItemData) => {
    setEditingMenu(item);
    setForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      prep_time_min: item.prep_time_min ? String(item.prep_time_min) : '',
      is_set_menu: item.is_set_menu,
      serves: item.serves ? String(item.serves) : '',
      category_id: item.category_id ? String(item.category_id) : '',
    });
    setOptionGroups([]);
    fetchOptionGroups(item.id);
    setMenuDialogOpen(true);
  };

  const saveOptionGroups = async (menuId: number) => {
    // 기존 옵션 그룹 목록 조회
    let existingGroups: OptionGroupData[] = [];
    try {
      const res = await apiClient.get(`/api/menus/${menuId}/options`);
      existingGroups = res.data.data || res.data || [];
    } catch { /* ignore */ }

    // 기존에 있었으나 현재 목록에 없는 그룹 삭제
    const currentGroupIds = optionGroups.filter((g) => g.id).map((g) => g.id);
    for (const eg of existingGroups) {
      if (eg.id && !currentGroupIds.includes(eg.id)) {
        try { await apiClient.delete(`/api/menus/options/${eg.id}`); } catch { /* ignore */ }
      }
    }

    for (const group of optionGroups) {
      if (!group.name.trim()) continue;

      let groupId = group.id;

      if (groupId) {
        // 기존 그룹 수정
        try {
          await apiClient.put(`/api/menus/options/${groupId}`, {
            name: group.name,
            is_required: group.is_required,
            min_select: group.min_select,
            max_select: group.max_select,
            sort_order: group.sort_order,
          });
        } catch { /* ignore */ }
      } else {
        // 새 그룹 생성
        try {
          const res = await apiClient.post(`/api/menus/${menuId}/options`, {
            name: group.name,
            is_required: group.is_required,
            min_select: group.min_select,
            max_select: group.max_select,
            sort_order: group.sort_order,
          });
          groupId = res.data.data?.id;
        } catch { continue; }
      }

      if (!groupId) continue;

      // 기존에 있었으나 현재 목록에 없는 아이템 삭제
      const existingGroup = existingGroups.find((eg) => eg.id === group.id);
      const currentItemIds = group.items.filter((it) => it.id).map((it) => it.id);
      if (existingGroup) {
        for (const ei of existingGroup.items || []) {
          if (ei.id && !currentItemIds.includes(ei.id)) {
            try { await apiClient.delete(`/api/menus/options/items/${ei.id}`); } catch { /* ignore */ }
          }
        }
      }

      // 아이템 생성/수정
      for (const item of group.items) {
        if (!item.name.trim()) continue;
        if (item.id) {
          try {
            await apiClient.put(`/api/menus/options/items/${item.id}`, {
              name: item.name,
              additional_price: item.additional_price,
              is_active: item.is_active,
              sort_order: item.sort_order,
            });
          } catch { /* ignore */ }
        } else {
          try {
            await apiClient.post(`/api/menus/options/${groupId}/items`, {
              name: item.name,
              additional_price: item.additional_price,
              is_active: item.is_active,
              sort_order: item.sort_order,
            });
          } catch { /* ignore */ }
        }
      }
    }
  };

  const handleMenuSave = async () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      prep_time_min: form.prep_time_min ? Number(form.prep_time_min) : undefined,
      is_set_menu: form.is_set_menu,
      serves: form.serves ? Number(form.serves) : undefined,
      category_id: form.category_id ? Number(form.category_id) : undefined,
      restaurant_id: restaurantId,
    };
    try {
      let menuId: number;
      if (editingMenu) {
        await apiClient.put(`/api/menus/${editingMenu.id}`, payload);
        menuId = editingMenu.id;
      } else {
        const res = await apiClient.post('/api/menus', payload);
        menuId = res.data.data?.id || res.data.id;
      }

      // 옵션 그룹 저장
      if (optionGroups.length > 0 || editingMenu) {
        await saveOptionGroups(menuId);
      }

      setMenuDialogOpen(false);
      fetchMenus();
    } catch (err: any) {
      alert(err.response?.data?.message || '저장에 실패했습니다.');
    }
  };

  const handleMenuDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiClient.delete(`/api/menus/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchMenus();
    } catch (err: any) {
      alert(err.response?.data?.message || '삭제에 실패했습니다.');
    }
  };

  // ── Category CRUD ──
  const openAddCat = () => {
    setEditingCat(null);
    setCatName('');
  };

  const openEditCat = (cat: MenuCategory) => {
    setEditingCat(cat);
    setCatName(cat.name);
  };

  const handleCatSave = async () => {
    if (!catName.trim()) return;
    try {
      if (editingCat) {
        await apiClient.put(`/api/menus/categories/${editingCat.id}`, { name: catName });
      } else {
        await apiClient.post('/api/menus/categories', { name: catName, restaurant_id: restaurantId });
      }
      setCatName('');
      setEditingCat(null);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || '카테고리 저장에 실패했습니다.');
    }
  };

  const handleCatDelete = async (catId: number) => {
    if (!window.confirm('이 카테고리를 삭제하시겠습니까?')) return;
    try {
      await apiClient.delete(`/api/menus/categories/${catId}`);
      fetchCategories();
    } catch (err: any) {
      alert(err.response?.data?.message || '카테고리 삭제에 실패했습니다.');
    }
  };

  // ── AI Menu Image Analysis ──
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Max 20MB
    if (file.size > 20 * 1024 * 1024) {
      setAiError('이미지 크기는 20MB 이하여야 합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      setAiDialogOpen(true);
      setAiLoading(true);
      setAiError('');
      setAiResults([]);

      try {
        const res = await apiClient.post('/api/menus/analyze-image', { image_base64: base64 });
        const menus = (res.data.data?.menus || []).map((m: any) => {
          // AI가 추정한 카테고리를 기존 카테고리에 자동 매칭
          let matchedCategory = m.category || '';
          if (matchedCategory) {
            const existingMatch = categories.find(
              (c) => c.name === matchedCategory || c.name.includes(matchedCategory) || matchedCategory.includes(c.name)
            );
            if (existingMatch) {
              matchedCategory = existingMatch.name;
            }
          }
          return { ...m, category: matchedCategory, selected: true };
        });
        if (menus.length === 0) {
          setAiError('메뉴를 인식하지 못했습니다. 더 선명한 사진을 사용해주세요.');
        }
        setAiResults(menus);
      } catch (err: any) {
        setAiError(err.response?.data?.error || 'AI 분석에 실패했습니다.');
      } finally {
        setAiLoading(false);
      }
    };
    reader.readAsDataURL(file);
    // input 초기화
    e.target.value = '';
  };

  const handleAiResultToggle = (idx: number) => {
    setAiResults((prev) => prev.map((item, i) => i === idx ? { ...item, selected: !item.selected } : item));
  };

  const handleAiResultEdit = (idx: number, field: string, value: string | number) => {
    if (field === 'category' && value === '__new__') {
      const newCatName = window.prompt('새 카테고리 이름을 입력하세요:');
      if (!newCatName || !newCatName.trim()) return;
      setAiResults((prev) => prev.map((item, i) => i === idx ? { ...item, category: newCatName.trim() } : item));
      return;
    }
    setAiResults((prev) => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleAiSave = async () => {
    const selected = aiResults.filter((m) => m.selected && m.name);
    if (selected.length === 0) return;

    setAiSaving(true);
    let saved = 0;
    for (const item of selected) {
      try {
        // 카테고리 매칭 (이름으로 찾거나 새로 생성)
        let categoryId: number | undefined;
        if (item.category) {
          const existing = categories.find((c) => c.name === item.category);
          if (existing) {
            categoryId = existing.id;
          } else {
            try {
              const catRes = await apiClient.post('/api/menus/categories', { name: item.category, restaurant_id: restaurantId });
              categoryId = catRes.data.data?.id || catRes.data.id;
              fetchCategories();
            } catch { /* ignore */ }
          }
        }

        await apiClient.post('/api/menus', {
          name: item.name,
          description: item.description || undefined,
          price: item.price || 0,
          category_id: categoryId,
          restaurant_id: restaurantId,
        });
        saved++;
      } catch { /* skip failed items */ }
    }

    setAiSaving(false);
    setAiDialogOpen(false);
    setSnackbar({ open: true, message: `${saved}개 메뉴가 등록되었습니다.`, severity: 'success' });
    fetchMenus();
    fetchCategories();
  };

  // ── Bulk Price Adjust ──
  const handleBulkPriceAdjust = async () => {
    const amount = Number(bulkAmount);
    if (!amount) return;

    setBulkLoading(true);
    try {
      const res = await apiClient.post('/api/menus/bulk-price', {
        restaurant_id: restaurantId,
        adjustment: amount,
        type: bulkType,
      });
      const count = res.data.data?.updated_count || 0;
      setBulkDialogOpen(false);
      setBulkAmount('');
      setSnackbar({ open: true, message: `${count}개 메뉴의 가격이 조정되었습니다.`, severity: 'success' });
      fetchMenus();
    } catch (err: any) {
      setSnackbar({ open: true, message: err.response?.data?.error || '가격 조정에 실패했습니다.', severity: 'error' });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Group menus by category ──
  const grouped = menus.reduce<Record<string, MenuItemData[]>>((acc, m) => {
    const key = m.category_name || '미분류';
    if (!acc[key]) acc[key] = [];
    acc[key].push(m);
    return acc;
  }, {});

  const formatPrice = (n: number) => n.toLocaleString('ko-KR') + '원';

  const handleFormChange = (field: keyof MenuForm, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ── JSX ──
  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Typography variant="h5" fontWeight={700}>메뉴 관리</Typography>
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            startIcon={<PhotoCamera />}
            variant="outlined"
            component="label"
            sx={{ borderColor: '#4CAF50', color: '#388E3C' }}
          >
            AI 메뉴판 인식
            <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
          </Button>
          {menus.length > 0 && (
            <Button startIcon={<TuneRounded />} variant="outlined" onClick={() => setBulkDialogOpen(true)}
              sx={{ borderColor: BRAND, color: BRAND_DARK }}>
              일괄 가격 조정
            </Button>
          )}
          <Button startIcon={<Category />} variant="outlined" onClick={() => setCatDialogOpen(true)}
            sx={{ borderColor: BRAND, color: BRAND_DARK }}>
            카테고리 관리
          </Button>
          <Button startIcon={<Add />} variant="contained" onClick={openAddMenu}
            sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK } }}>
            메뉴 추가
          </Button>
        </Box>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: BRAND }} />
        </Box>
      )}

      {!loading && menus.length === 0 && (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 8 }}>
          등록된 메뉴가 없습니다. 메뉴를 추가해주세요.
        </Typography>
      )}

      {/* Menu cards grouped by category */}
      {Object.entries(grouped).map(([catName, items]) => (
        <Box key={catName} sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight={600} sx={{ mb: 1.5, color: BRAND_DARK }}>
            {catName}
          </Typography>
          <Grid container spacing={2}>
            {items.map((item) => (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={item.id}>
                <Card
                  variant="outlined"
                  sx={{
                    borderRadius: 2.5,
                    borderColor: 'rgba(17,17,17,0.06)',
                    opacity: item.is_active ? 1 : 0.55,
                  }}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={700}>{item.name}</Typography>
                        <Typography variant="h6" fontWeight={700} sx={{ color: BRAND_DARK }}>
                          {formatPrice(item.price)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {item.is_set_menu && <Chip label="세트" size="small" sx={{ bgcolor: BRAND_LIGHT }} />}
                        {!item.is_active && <Chip label="비활성" size="small" color="default" />}
                      </Box>
                    </Box>

                    {item.description && (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {item.description}
                      </Typography>
                    )}

                    <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                      {item.prep_time_min && (
                        <Typography variant="body2" color="text.secondary">
                          준비 {item.prep_time_min}분
                        </Typography>
                      )}
                      {item.serves && (
                        <Typography variant="body2" color="text.secondary">
                          {item.serves}인분
                        </Typography>
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                      <IconButton size="small" onClick={() => openEditMenu(item)} sx={{ color: BRAND_DARK }}>
                        <Edit fontSize="small" />
                      </IconButton>
                      <IconButton size="small" onClick={() => setDeleteTarget(item)} color="error">
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}

      {/* ── Menu Add/Edit Dialog ── */}
      <Dialog open={menuDialogOpen} onClose={() => setMenuDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMenu ? '메뉴 수정' : '메뉴 추가'}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
          <TextField label="메뉴명" value={form.name} required fullWidth
            onChange={(e) => handleFormChange('name', e.target.value)} />
          <TextField label="설명" value={form.description} multiline rows={2} fullWidth
            onChange={(e) => handleFormChange('description', e.target.value)} />
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="가격 (원)" type="number" value={form.price} required sx={{ flex: 1 }}
              onChange={(e) => handleFormChange('price', e.target.value)} />
            <TextField label="준비시간 (분)" type="number" value={form.prep_time_min} sx={{ flex: 1 }}
              onChange={(e) => handleFormChange('prep_time_min', e.target.value)} />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>카테고리</InputLabel>
              <Select
                value={form.category_id}
                label="카테고리"
                onChange={(e: SelectChangeEvent) => handleFormChange('category_id', e.target.value)}
              >
                <MenuItem value="">미분류</MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={String(c.id)}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField label="인분" type="number" value={form.serves} sx={{ width: 100 }}
              onChange={(e) => handleFormChange('serves', e.target.value)} />
          </Box>
          <FormControlLabel
            control={
              <Switch checked={form.is_set_menu}
                onChange={(e) => handleFormChange('is_set_menu', e.target.checked)} />
            }
            label="세트 메뉴"
          />

          {/* ── 옵션 그룹 관리 섹션 ── */}
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="subtitle1" fontWeight={600}>옵션 그룹</Typography>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={handleAddOptionGroup}
              sx={{ color: BRAND_DARK }}
            >
              옵션 그룹 추가
            </Button>
          </Box>

          {optionGroupsLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
              <CircularProgress size={24} sx={{ color: BRAND }} />
            </Box>
          )}

          {!optionGroupsLoading && optionGroups.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
              등록된 옵션 그룹이 없습니다.
            </Typography>
          )}

          {optionGroups.map((group, groupIdx) => (
            <Accordion
              key={group.id || `new-${groupIdx}`}
              defaultExpanded={!group.id}
              sx={{ mb: 1, border: '1px solid', borderColor: 'divider', '&:before': { display: 'none' } }}
              elevation={0}
            >
              <AccordionSummary expandIcon={<ExpandMore />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', pr: 1 }}>
                  <Typography variant="subtitle2" fontWeight={600} sx={{ flex: 1 }}>
                    {group.name || '새 옵션 그룹'}
                  </Typography>
                  {group.is_required && (
                    <Chip label="필수" size="small" color="error" variant="outlined" />
                  )}
                  <Tooltip title="옵션 그룹 삭제">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => { e.stopPropagation(); handleRemoveOptionGroup(groupIdx); }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <TextField
                    label="그룹 이름"
                    size="small"
                    value={group.name}
                    onChange={(e) => handleOptionGroupChange(groupIdx, 'name', e.target.value)}
                    placeholder="예: 맵기 선택, 사이즈"
                    fullWidth
                  />
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <FormControlLabel
                      control={
                        <Switch
                          size="small"
                          checked={group.is_required}
                          onChange={(e) => handleOptionGroupChange(groupIdx, 'is_required', e.target.checked)}
                        />
                      }
                      label="필수 선택"
                    />
                    <TextField
                      label="최소 선택"
                      type="number"
                      size="small"
                      value={group.min_select}
                      onChange={(e) => handleOptionGroupChange(groupIdx, 'min_select', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 0 }}
                    />
                    <TextField
                      label="최대 선택"
                      type="number"
                      size="small"
                      value={group.max_select}
                      onChange={(e) => handleOptionGroupChange(groupIdx, 'max_select', Number(e.target.value))}
                      sx={{ width: 100 }}
                      inputProps={{ min: 1 }}
                    />
                  </Box>

                  <Divider sx={{ my: 0.5 }} />
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    옵션 아이템
                  </Typography>

                  {group.items.map((item, itemIdx) => (
                    <Box
                      key={item.id || `new-item-${itemIdx}`}
                      sx={{ display: 'flex', gap: 1, alignItems: 'center' }}
                    >
                      <TextField
                        size="small"
                        placeholder="옵션 이름"
                        value={item.name}
                        onChange={(e) => handleOptionItemChange(groupIdx, itemIdx, 'name', e.target.value)}
                        sx={{ flex: 1 }}
                      />
                      <TextField
                        size="small"
                        type="number"
                        placeholder="추가 가격"
                        value={item.additional_price}
                        onChange={(e) => handleOptionItemChange(groupIdx, itemIdx, 'additional_price', Number(e.target.value))}
                        sx={{ width: 120 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">원</InputAdornment> }}
                      />
                      <Tooltip title="아이템 삭제">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveOptionItem(groupIdx, itemIdx)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ))}

                  <Button
                    size="small"
                    startIcon={<AddCircleOutline />}
                    onClick={() => handleAddOptionItem(groupIdx)}
                    sx={{ alignSelf: 'flex-start', color: BRAND_DARK }}
                  >
                    옵션 아이템 추가
                  </Button>
                </Box>
              </AccordionDetails>
            </Accordion>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMenuDialogOpen(false)}>취소</Button>
          <Button onClick={handleMenuSave} variant="contained" disabled={!form.name || !form.price}
            sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK } }}>
            {editingMenu ? '수정' : '추가'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)}>
        <DialogTitle>메뉴 삭제 확인</DialogTitle>
        <DialogContent>
          <Typography>
            <strong>{deleteTarget?.name}</strong> 메뉴를 삭제하시겠습니까?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>취소</Button>
          <Button onClick={handleMenuDelete} color="error" variant="contained">삭제</Button>
        </DialogActions>
      </Dialog>

      {/* ── AI Menu Analysis Dialog ── */}
      <Dialog open={aiDialogOpen} onClose={() => !aiLoading && !aiSaving && setAiDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PhotoCamera sx={{ color: '#4CAF50' }} />
          AI 메뉴판 인식 결과
        </DialogTitle>
        <DialogContent>
          {aiLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress sx={{ color: '#4CAF50', mb: 2 }} />
              <Typography color="text.secondary">메뉴판을 분석 중입니다...</Typography>
              <LinearProgress sx={{ mt: 2, '& .MuiLinearProgress-bar': { bgcolor: '#4CAF50' } }} />
            </Box>
          )}

          {aiError && <Alert severity="error" sx={{ mb: 2 }}>{aiError}</Alert>}

          {!aiLoading && aiResults.length > 0 && (
            <>
              <Alert severity="info" sx={{ mb: 2 }}>
                {aiResults.length}개 메뉴를 인식했습니다. 체크 해제하면 등록에서 제외됩니다. 이름/가격을 직접 수정할 수 있습니다.
              </Alert>
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: BRAND_LIGHT }}>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={aiResults.every((r) => r.selected)}
                          onChange={(e) => setAiResults((prev) => prev.map((r) => ({ ...r, selected: e.target.checked })))}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>메뉴명</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120 }}>가격</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>설명</TableCell>
                      <TableCell sx={{ fontWeight: 600, width: 120 }}>카테고리</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {aiResults.map((item, idx) => (
                      <TableRow key={idx} sx={{ opacity: item.selected ? 1 : 0.4 }}>
                        <TableCell padding="checkbox">
                          <Checkbox checked={item.selected} onChange={() => handleAiResultToggle(idx)} />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" variant="standard" value={item.name} fullWidth
                            onChange={(e) => handleAiResultEdit(idx, 'name', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" variant="standard" type="number" value={item.price}
                            onChange={(e) => handleAiResultEdit(idx, 'price', Number(e.target.value))}
                            InputProps={{ endAdornment: <InputAdornment position="end">원</InputAdornment> }}
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small" variant="standard" value={item.description || ''} fullWidth
                            onChange={(e) => handleAiResultEdit(idx, 'description', e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" fullWidth variant="standard">
                            <Select
                              value={item.category || ''}
                              displayEmpty
                              onChange={(e) => handleAiResultEdit(idx, 'category', e.target.value)}
                            >
                              <MenuItem value="" disabled>
                                <em>선택</em>
                              </MenuItem>
                              {/* 기존 카테고리 */}
                              {categories.map((c) => (
                                <MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>
                              ))}
                              {/* 기본 AI 카테고리 중 기존에 없는 것 */}
                              {DEFAULT_AI_CATEGORIES
                                .filter((dc) => !categories.some((c) => c.name === dc))
                                .map((dc) => (
                                  <MenuItem key={`default-${dc}`} value={dc}>
                                    {dc} <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>(새로 생성)</Typography>
                                  </MenuItem>
                                ))}
                              {/* AI가 추정한 카테고리가 기존+기본에 없으면 별도 표시 */}
                              {item.category &&
                                !categories.some((c) => c.name === item.category) &&
                                !DEFAULT_AI_CATEGORIES.includes(item.category) && (
                                  <MenuItem value={item.category}>
                                    {item.category} <Typography component="span" variant="caption" sx={{ ml: 0.5, color: 'info.main' }}>(AI 추정, 새로 생성)</Typography>
                                  </MenuItem>
                                )}
                              <Divider />
                              <MenuItem value="__new__">
                                <AddCircleOutline fontSize="small" sx={{ mr: 0.5 }} /> 새 카테고리 추가...
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)} disabled={aiLoading || aiSaving}>취소</Button>
          <Button
            onClick={handleAiSave}
            variant="contained"
            disabled={aiLoading || aiSaving || aiResults.filter((r) => r.selected).length === 0}
            startIcon={aiSaving ? <CircularProgress size={16} /> : <CheckCircle />}
            sx={{ bgcolor: '#4CAF50', '&:hover': { bgcolor: '#388E3C' } }}
          >
            {aiSaving ? '등록 중...' : `${aiResults.filter((r) => r.selected).length}개 메뉴 등록`}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Bulk Price Adjust Dialog ── */}
      <Dialog open={bulkDialogOpen} onClose={() => !bulkLoading && setBulkDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>일괄 가격 조정</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            전체 메뉴의 가격을 일괄적으로 조정합니다. 내리려면 음수를 입력하세요.
          </Typography>
          <FormControl>
            <RadioGroup row value={bulkType} onChange={(e) => setBulkType(e.target.value as 'fixed' | 'percent')}>
              <FormControlLabel value="fixed" control={<Radio />} label="금액 (원)" />
              <FormControlLabel value="percent" control={<Radio />} label="비율 (%)" />
            </RadioGroup>
          </FormControl>
          <TextField
            fullWidth
            type="number"
            label={bulkType === 'fixed' ? '조정 금액 (원)' : '조정 비율 (%)'}
            placeholder={bulkType === 'fixed' ? '예: 1000 (인상) 또는 -500 (인하)' : '예: 10 (10% 인상) 또는 -5 (5% 인하)'}
            value={bulkAmount}
            onChange={(e) => setBulkAmount(e.target.value)}
            sx={{ mt: 2 }}
            InputProps={{
              endAdornment: <InputAdornment position="end">{bulkType === 'fixed' ? '원' : '%'}</InputAdornment>,
            }}
          />
          {bulkAmount && (
            <Alert severity="info" sx={{ mt: 2 }}>
              {Number(bulkAmount) > 0 ? '인상' : '인하'}: 전체 {menus.length}개 메뉴에{' '}
              {bulkType === 'fixed'
                ? `${Math.abs(Number(bulkAmount)).toLocaleString()}원`
                : `${Math.abs(Number(bulkAmount))}%`}
              {Number(bulkAmount) > 0 ? ' 인상' : ' 인하'}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)} disabled={bulkLoading}>취소</Button>
          <Button
            onClick={handleBulkPriceAdjust}
            variant="contained"
            disabled={bulkLoading || !bulkAmount || Number(bulkAmount) === 0}
            sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK } }}
          >
            {bulkLoading ? <CircularProgress size={20} /> : '가격 조정'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Snackbar ── */}
      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* ── Category Management Dialog ── */}
      <Dialog open={catDialogOpen} onClose={() => setCatDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>카테고리 관리</DialogTitle>
        <DialogContent>
          {/* Add / Edit form */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2, mt: 1 }}>
            <TextField
              label={editingCat ? '카테고리명 수정' : '새 카테고리명'}
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              size="small"
              fullWidth
              onKeyDown={(e) => { if (e.key === 'Enter') handleCatSave(); }}
            />
            <Button variant="contained" onClick={handleCatSave} disabled={!catName.trim()}
              sx={{ bgcolor: BRAND, '&:hover': { bgcolor: BRAND_DARK }, whiteSpace: 'nowrap' }}>
              {editingCat ? '수정' : '추가'}
            </Button>
            {editingCat && (
              <Button variant="outlined" onClick={openAddCat}>취소</Button>
            )}
          </Box>

          <Divider />

          {/* Category list */}
          <List>
            {categories.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                등록된 카테고리가 없습니다.
              </Typography>
            )}
            {categories.map((cat) => (
              <ListItem
                key={cat.id}
                secondaryAction={
                  <>
                    <IconButton size="small" onClick={() => openEditCat(cat)} sx={{ color: BRAND_DARK }}>
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleCatDelete(cat.id)} color="error">
                      <Delete fontSize="small" />
                    </IconButton>
                  </>
                }
              >
                <ListItemText primary={cat.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCatDialogOpen(false)}>닫기</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MenuManagement;
