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
  ListItemSecondaryAction,
  SelectChangeEvent,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Category,
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

interface MenuForm {
  name: string;
  description: string;
  price: string;
  prep_time_min: string;
  is_set_menu: boolean;
  serves: string;
  category_id: string;
}

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

  // ── Fetch ──
  const fetchMenus = useCallback(async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      setError('');
      const res = await apiClient.get(`/api/menus/restaurant/${restaurantId}`);
      setMenus(res.data.menus ?? res.data);
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
      setCategories(res.data.categories ?? res.data);
    } catch {
      // silent — categories may be empty
    }
  }, [restaurantId]);

  useEffect(() => {
    fetchMenus();
    fetchCategories();
  }, [fetchMenus, fetchCategories]);

  // ── Menu CRUD ──
  const openAddMenu = () => {
    setEditingMenu(null);
    setForm(EMPTY_FORM);
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
    setMenuDialogOpen(true);
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
      if (editingMenu) {
        await apiClient.put(`/api/menus/${editingMenu.id}`, payload);
      } else {
        await apiClient.post('/api/menus', payload);
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
        <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
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
              <Grid item xs={12} sm={6} md={4} key={item.id}>
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
              <ListItem key={cat.id}>
                <ListItemText primary={cat.name} />
                <ListItemSecondaryAction>
                  <IconButton size="small" onClick={() => openEditCat(cat)} sx={{ color: BRAND_DARK }}>
                    <Edit fontSize="small" />
                  </IconButton>
                  <IconButton size="small" onClick={() => handleCatDelete(cat.id)} color="error">
                    <Delete fontSize="small" />
                  </IconButton>
                </ListItemSecondaryAction>
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
