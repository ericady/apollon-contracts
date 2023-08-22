'use client';

import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import Square from '@mui/icons-material/Square';
import Button from '@mui/material/Button';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import Label from '../../Label/Label';

const Positions = () => {
  const theme = useTheme();
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <>
      <div className="tabs-sheet">
        <Tabs value={value} onChange={handleChange} aria-label="Shared Data Tabs" className="farm-tabs-heading">
          <Tab label="BALANCE" />
          <Tab label="COLLATERAL" />
          <Tab
            label={
              <span>
                POSITIONS <Typography variant="h6">2</Typography>
              </span>
            }
          />
          <Tab
            label={
              <span>
                HISTORY <Typography variant="h6">48</Typography>
              </span>
            }
          />
        </Tabs>
        {value === 0 && (
          <div className="tab-content">
            <div className="balance-tab">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-hdng">
                        %<ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Amount
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Symbol
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Value
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Price
                        <ArrowDropDownIcon />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">11363.21</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">dAAPL</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">34345.45</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">dTSLA</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">18632.78</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">dGLD</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
              <TableContainer sx={{ borderLeft: '2px solid #1E1B27' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-hdng">
                        %<ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Amount
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Symbol
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Value
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Price
                        <ArrowDropDownIcon />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">85314.21</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">BTC</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">65448.45</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">ETH</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>8%</TableCell>
                      <TableCell>
                        <div className="table-wht-txt">19632.45</div>
                      </TableCell>
                      <TableCell>
                        <div className="table-box">USDC</div>
                      </TableCell>
                      <TableCell>45.352,52 $</TableCell>
                      <TableCell>534.64 $</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        )}
        {value === 1 && (
          <div className="tab-content">
            <div className="colletral-tab">
              <div className="pie-block"></div>
              <div className="table-block">
                <div className="range-slide">
                  <Typography variant="body1" sx={{ color: '#303A4C', fontSize: '24px' }} className="range-hdng">
                    <span>174 %</span> <Square sx={{ color: '#fff', fontSize: '14px' }} />
                    Collateral Ratio
                  </Typography>
                  <Button
                    variant="outlined"
                    sx={{
                      width: 'auto',
                      padding: '0 50px',
                    }}
                  >
                    UPDATE
                  </Button>
                </div>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell className="table-hdng">
                          Locked
                          <ArrowDropDownIcon />
                        </TableCell>
                        <TableCell className="table-hdng">
                          Avaiable
                          <ArrowDropDownIcon />
                        </TableCell>
                        <TableCell className="table-hdng">
                          Symbol
                          <ArrowDropDownIcon />
                        </TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <div className="table-wht-txt">
                            {' '}
                            <div className="flex">
                              <Square
                                sx={{
                                  color: '#33B6FF',
                                  fontSize: '14px',
                                }}
                              />
                              3.03656
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>1,35644</TableCell>
                        <TableCell>
                          <div className="table-box">BTC</div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <div className="table-wht-txt">
                            {' '}
                            <div className="flex">
                              <Square
                                sx={{
                                  color: '#E04A4A',
                                  fontSize: '14px',
                                }}
                              />
                              0.00143
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>18,44356</TableCell>
                        <TableCell>
                          <div className="table-box">ETH</div>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <div className="table-wht-txt">
                            {' '}
                            <div className="flex">
                              <Square
                                sx={{
                                  color: '#3DD755',
                                  fontSize: '14px',
                                }}
                              />
                              345.423,34563{' '}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>3.481,84567</TableCell>
                        <TableCell>
                          <div className="table-box">Jelly</div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </div>
            </div>
          </div>
        )}
        {value === 2 && (
          <div className="tab-content">
            <div className="position-tab">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-hdng">
                        Opening
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Type
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Size
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Total position
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Price per unit
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Fee
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        PNL
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>12.06.2023 12:34 (-12d)</TableCell>
                      <TableCell>
                        <Label variant="success">Long</Label>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">18,54453</div>
                          <div className="table-box">dAAPL</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">34.345,45 </div>
                          <div className="table-box">jUSD</div>
                        </div>
                      </TableCell>
                      <TableCell>453,45 jUSD</TableCell>
                      <TableCell>0.00036 jUSD </TableCell>
                      <TableCell>
                        <div className="flex">
                          <Typography sx={{ color: theme.palette.success.main, fontWeight: '400' }}>
                            5.624,65 jUSD{' '}
                          </Typography>{' '}
                          <Typography sx={{ color: theme.palette.success.main, fontWeight: '400' }}>3.43 %</Typography>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="rounded">Close</Button>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>06.06.2023 12:24 (-18d)</TableCell>
                      <TableCell>
                        <Label variant="error">Short</Label>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">23,5432</div>
                          <div className="table-box">dAAPL</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">54.523,12</div>
                          <div className="table-box">jUSD</div>
                        </div>
                      </TableCell>
                      <TableCell>399,23 jUSD</TableCell>
                      <TableCell>0.00021 jUSD</TableCell>
                      <TableCell>
                        <div className="flex">
                          <Typography sx={{ color: theme.palette.error.main, fontWeight: '400' }}>
                            3.122,16 jUSD{' '}
                          </Typography>{' '}
                          <Typography sx={{ color: theme.palette.error.main, fontWeight: '400' }}>-1.16 %</Typography>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="rounded">Close</Button>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        )}
        {value === 3 && (
          <div className="tab-content">
            <div className="position-tab">
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell className="table-hdng">
                        Opening
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Type
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Size
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Total position
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Price per unit
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        Fee
                        <ArrowDropDownIcon />
                      </TableCell>
                      <TableCell className="table-hdng">
                        PNL
                        <ArrowDropDownIcon />
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>12.06.2023 12:34 (-12d)</TableCell>
                      <TableCell>
                        <Label variant="success">Long</Label>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">18,54453</div>
                          <div className="table-box">dAAPL</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">34.345,45 </div>
                          <div className="table-box">jUSD</div>
                        </div>
                      </TableCell>
                      <TableCell>453,45 jUSD</TableCell>
                      <TableCell>0.00036 jUSD </TableCell>
                      <TableCell>
                        <div className="flex">
                          <Typography sx={{ color: theme.palette.success.main, fontWeight: '400' }}>
                            5.624,65 jUSD{' '}
                          </Typography>{' '}
                          <Typography sx={{ color: theme.palette.success.main, fontWeight: '400' }}>3.43 %</Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>06.06.2023 12:24 (-18d)</TableCell>
                      <TableCell>
                        <Label variant="error">Short</Label>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">23,5432</div>
                          <div className="table-box">dAAPL</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex">
                          <div className="table-wht-txt">54.523,12</div>
                          <div className="table-box">jUSD</div>
                        </div>
                      </TableCell>
                      <TableCell>399,23 jUSD</TableCell>
                      <TableCell>0.00021 jUSD</TableCell>
                      <TableCell>
                        <div className="flex">
                          <Typography sx={{ color: theme.palette.error.main, fontWeight: '400' }}>
                            3.122,16 jUSD{' '}
                          </Typography>{' '}
                          <Typography sx={{ color: theme.palette.error.main, fontWeight: '400' }}>-1.16 %</Typography>
                        </div>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Positions;
