import BedtimeIcon from '@mui/icons-material/Bedtime';
import LightModeIcon from '@mui/icons-material/LightMode';
import { PaletteMode, PaletteOptions, ToggleButton, ToggleButtonGroup } from '@mui/material';
import { Dispatch, SetStateAction } from 'react';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';

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
      }}
    >
      <ToggleButton
        value="light"
        disabled={themeMode === 'light'}
        aria-label="toggle light mode"
        sx={{
          borderRadius: "3px",
          borderColor: 'background.emphasis',
          backgroundColor: 'background.emphasis',
          pr: '7px',
          pl: '14px',
          '&.Mui-selected': {
          borderColor: 'background.emphasis',
            backgroundColor: 'background.emphasis',
            '&:hover': {
              backgroundColor: 'background.emphasis',
            },
          },
          '&:hover': {
            backgroundColor: 'background.emphasis',
          },
        }}
      >
        {/* TODO: Add proper icon later */}
        <LightModeOutlinedIcon fontSize="small" color={themeMode !== 'light' ? 'disabled' : undefined} />
      </ToggleButton>

      <ToggleButton
        value="dark"
        disabled={themeMode === 'dark'}
        aria-label="toggle light mode"
        sx={{
          borderRadius: "3px",
          borderColor: 'background.emphasis',
          backgroundColor: 'background.emphasis',
          pl: '7px',
          pr: '14px',
          '&.Mui-selected': {
          borderColor: 'background.emphasis',
            backgroundColor: 'background.emphasis',
            '&:hover': {
              backgroundColor: 'background.emphasis',
            },
          },
          '&:hover': {
            backgroundColor: 'background.emphasis',
          },
        }}
      >
        {/* TODO: Add proper icon later */}
        <DarkModeOutlinedIcon fontSize="small" color={themeMode !== 'dark' ? 'disabled' : undefined} />
      </ToggleButton>
    </ToggleButtonGroup>
  );
}

export default ThemeSwitch;
