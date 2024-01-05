INSERT INTO sgd1.token (block_range, id, address, symbol, created_at, price_usd, is_pool_token)
VALUES
('[1,2]', '\xabcdef12345678901', '\x1234567890abcdef', 'TOKEN1', 1000000, 10.0, FALSE),
('[2,3]', '\xabcdef12345678902', '\xabcdef1234567890', 'TOKEN2', 1001000, 20.0, FALSE),
('[3,4]', '\xabcdef12345678903', '\xfeedface12345678', 'TOKEN3', 1002000, 30.0, FALSE),
('[4,5]', '\xabcdef12345678904', '\xdeadbeef12345678', 'TOKEN4', 1003000, 40.0, FALSE);
