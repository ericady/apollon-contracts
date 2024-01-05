INSERT INTO sgd1.pool (block_range, id, liquidity, liquidity_deposit_apy, volume_3_0d_usd, volume_3_0d_usd3_0d_ago, total_supply)
VALUES
('[1,2]', 'Pool1', ARRAY['\x0123', '\x4567']::bytea[], 5.0, '\x89abcdef', '\xabcdef89', 1000000.0),
('[2,3]', 'Pool2', ARRAY['\x89ab', '\xcded']::bytea[], 6.0, '\x12345678', '\x87654321', 1100000.0),
('[3,4]', 'Pool3', ARRAY['\xfeed', '\xbabe']::bytea[], 7.0, '\x11223344', '\x44332211', 1200000.0),
('[4,5]', 'Pool4', ARRAY['\xdead', '\xbeef']::bytea[], 8.0, '\xaabbccdd', '\xddccbbaa', 1300000.0);
