import CloseIcon from '@mui/icons-material/Close';
import ExpandLessSharpIcon from '@mui/icons-material/ExpandLessSharp';
import Square from '@mui/icons-material/Square';
import { Dialog, DialogContent, DialogTitle, IconButton } from '@mui/material';
import Typography from '@mui/material/Typography';
import Label from '../../Label/Label';

const StabilityHistory = () => {
  return (
    <Dialog open fullWidth>
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'background.paper',
          borderBottom: 'none',
        }}
      >
        <div>
          <Square
            sx={{
              color: '#504D59',
              fontSize: '12px',
              marginRight: '15px',
            }}
          />
          <Typography variant="h6" display="inline-block">
            STABILITY PER HISTORY
          </Typography>
        </div>
        <IconButton>
          <CloseIcon
            sx={{
              color: '#64616D',
            }}
          />
        </IconButton>
      </DialogTitle>
      <DialogContent
        sx={{
          p: 0,
          backgroundColor: 'background.default',
          border: '1px solid',
          borderColor: 'background.paper',
        }}
      >
        <div className="history-block" style={{ borderBottom: '2px solid #25222E', padding: '20px' }}>
          <div className="history-hdng flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="flex">
              <Typography>13.04.2023 18:07</Typography>
            </div>

            <Label variant="success">Claimed Collateral</Label>
          </div>

          <div className="history-stability">
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', minWidth: 120, gap: 20 }}>
              <div className="flex">
                <Typography fontWeight={400}>3.46815</Typography>
                <Label variant="none">dPSL</Label>
              </div>

              <div className="flex">
                <Typography fontWeight={400}>1.81789</Typography>
                <Label variant="none">dAAPL</Label>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
              <div
                style={{
                  background: '#18293e',
                  border: '1px solid #33b6ff',
                  padding: '10px',
                  width: 170,
                }}
              >
                <Typography
                  className="flex"
                  sx={{ color: '#33B6FF', fontWeight: '400', gap: '5px', marginBottom: '20px' }}
                >
                  + 3.18 % <ExpandLessSharpIcon sx={{ color: '#33B6FF' }} />
                </Typography>
                <Typography className="flex" sx={{ color: '#33B6FF', fontWeight: '400', gap: '5px' }}>
                  + 35118.18 $ <ExpandLessSharpIcon sx={{ color: '#33B6FF' }} />
                </Typography>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div className="flex">
                <Typography fontWeight={400}>8.18571</Typography>
                <Label variant="none">ETH</Label>
              </div>

              <div className="flex">
                <Typography fontWeight={400}>187.18871</Typography>
                <Label variant="none">BTC</Label>
              </div>

              <div className="flex">
                <Typography fontWeight={400}>187.18871</Typography>
                <Label variant="none">YLT</Label>
              </div>

              <div className="flex">
                <Typography fontWeight={400}>187.18871</Typography>
                <Label variant="none">USDT</Label>
              </div>
            </div>
          </div>
        </div>

        <div className="history-block" style={{ borderBottom: '2px solid #25222E', padding: '20px' }}>
          <div className="history-hdng flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="flex">
              <Typography>11.04.2023 06:03</Typography>
            </div>

            <Label variant="none">Deposited token</Label>
          </div>

          <div className="history-value">
            <div className="flex">
              <Typography fontWeight={400}>1.78145</Typography>
              <Label variant="none">AAPL</Label>
            </div>

            <div className="flex">
              <Typography fontWeight={400}>8.14431</Typography>
              <Label variant="none">TSLA</Label>
            </div>
          </div>
        </div>

        <div className="history-block" style={{ padding: '20px' }}>
          <div className="history-hdng flex" style={{ justifyContent: 'space-between', marginBottom: '20px' }}>
            <div className="flex">
              <Typography>03.02.2023 15:18</Typography>
            </div>

            <Label variant="info">Withdrawn token</Label>
          </div>

          <div className="history-value">
            <div className="flex">
              <Typography fontWeight={400}>8.00012</Typography>
              <Label variant="none">GLD</Label>
            </div>

            <div className="flex">
              <Typography fontWeight={400}>181.00028</Typography>
              <Label variant="none">TSLA</Label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StabilityHistory;
