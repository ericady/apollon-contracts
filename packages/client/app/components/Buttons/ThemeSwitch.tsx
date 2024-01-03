import BedtimeIcon from '@mui/icons-material/Bedtime';
import LightModeIcon from '@mui/icons-material/LightMode';
import { PaletteMode, PaletteOptions, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';

export const ThemeModeLocalStorageKey = 'apollon-themeMode';
type Props = {
  themeMode: PaletteMode;
  setThemeMode: Dispatch<SetStateAction<PaletteMode>>;
};

function ThemeSwitch({ themeMode, setThemeMode }: Props) {
  const persistModeInLocalStorage = (mode: PaletteMode) => {
    localStorage.setItem(ThemeModeLocalStorageKey, mode);
  };

  return (
    <ToggleButtonGroup
      value={themeMode}
      exclusive
      onChange={(_: React.MouseEvent<HTMLElement>, nextMode: PaletteOptions['mode']) => {
        persistModeInLocalStorage(nextMode!);
        setThemeMode(nextMode!);
      }}
      aria-label="change theme mode"
      sx={{
        height: '32px',
        borderColor: 'background.paper',
      }}
    >
      <ToggleButton
        value="light"
        disabled={themeMode === 'light'}
        aria-label="toggle light mode"
        sx={{
          borderRadius: 25,
          backgroundColor: 'table.border',
          pr: '7px',
          pl: '14px',
          '&.Mui-selected': {
            backgroundColor: 'table.border',
            '&:hover': {
              backgroundColor: 'table.border',
            },
          },
          '&:hover': {
            backgroundColor: 'table.border',
          },
        }}
      >
        {/* TODO: Add proper icon later */}
        <LightModeIcon fontSize="small" color={themeMode !== 'light' ? 'disabled' : undefined} />
      </ToggleButton>

      <ToggleButton
        value="dark"
        disabled={themeMode === 'dark'}
        aria-label="toggle light mode"
        sx={{
          borderRadius: 25,
          backgroundColor: 'table.border',
          pl: '7px',
          pr: '14px',
          '&.Mui-selected': {
            backgroundColor: 'table.border',
            '&:hover': {
              backgroundColor: 'table.border',
            },
          },
          '&:hover': {
            backgroundColor: 'table.border',
          },
        }}
      >
        {/* TODO: Add proper icon later */}
        <BedtimeIcon fontSize="small" color={themeMode !== 'dark' ? 'disabled' : undefined} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default ThemeSwitch;
