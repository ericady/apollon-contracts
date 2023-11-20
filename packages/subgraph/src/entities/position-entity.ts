import { ethereum } from '@graphprotocol/graph-ts';

/**
 * Create a new open position and leave the closed properties as null
 */
export function handleCreatePosition(event: ethereum.Event): void {}

/**
 * Updated an open position only and set closed properties
 */
export function handleUpdatePosition(event: ethereum.Event): void {}
