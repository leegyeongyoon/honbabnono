import '@mui/material/styles';

// palette.custom 타입 보강 — theme.palette.custom.kanban 등 strict 통과
declare module '@mui/material/styles' {
  interface KanbanColor { bg: string; accent: string; }
  interface CustomPalette {
    brand: string;
    brandSoft: string;
    kanban: {
      pending: KanbanColor;
      preparing: KanbanColor;
      cooking: KanbanColor;
      ready: KanbanColor;
    };
  }
  interface Palette { custom: CustomPalette; }
  interface PaletteOptions { custom?: CustomPalette; }
}
