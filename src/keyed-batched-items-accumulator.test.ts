/**
 * Copyright 2025 Ori Cohen https://github.com/ori88c
 * https://github.com/ori88c/keyed-batched-items-accumulator
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { KeyedBatchedAccumulator } from './keyed-batched-items-accumulator';

interface IMockEvent {
  id: number;
}

function validateBatches(
  extractedBatches: IMockEvent[][],
  expectedOrderedEvents: IMockEvent[],
): void {
  let expectedEventIndex = 0;

  for (const batch of extractedBatches) {
    for (const event of batch) {
      expect(event).toBe(expectedOrderedEvents[expectedEventIndex]); // Ensures reference equality.
      ++expectedEventIndex;
    }
  }

  expect(expectedEventIndex).toBe(expectedOrderedEvents.length);
}

describe('BatchedAccumulator tests', () => {
  describe('Happy path tests', () => {
    /**
     * Verifies that the accumulator maintains correct internal state when events are
     * randomly distributed across multiple keys, simulating realistic usage patterns.
     */
    test('should maintain correct state and key tracking under randomized key-to-item associations', () => {
      // Arrange.
      const batchSize = 96;
      const keyedAccumulator = new KeyedBatchedAccumulator<IMockEvent>(batchSize);
      const totalNumberOfItems = batchSize * 17 + 49;
      const events: readonly IMockEvent[] = new Array<number>(totalNumberOfItems)
        .fill(0)
        .map((_, index): IMockEvent => ({ id: index }));
      const keys: readonly string[] = [
        'threat-detections',
        'auth-events',
        'network-logs',
        'dns-queries',
      ];
      const sampleRandomKey = (): string => keys[Math.floor(Math.random() * keys.length)];
      const keyToEvents = new Map<string, IMockEvent[]>();
      for (const key of keys) {
        keyToEvents.set(key, []);
      }

      // Act & Intermediate Assert:
      // Distribute events across keys at random and verify state consistency after each insertion.
      let pushedEventsCounter = 0;
      for (const event of events) {
        const chosenKey = sampleRandomKey();
        const respectiveEvents = keyToEvents.get(chosenKey);
        respectiveEvents.push(event);
        keyedAccumulator.push(event, chosenKey);
        expect(keyedAccumulator.totalAccumulatedItemsCount).toBe(++pushedEventsCounter);
        expect(keyedAccumulator.isEmpty).toBe(false);
        expect(keyedAccumulator.isActiveKey(chosenKey)).toBe(true);
        expect(keyedAccumulator.getAccumulatedItemsCount(chosenKey)).toBe(respectiveEvents.length);
      }

      // Assert.
      expect(keyedAccumulator.activeKeysCount).toBe(keys.length);
      const activeKeys = keyedAccumulator.activeKeys;
      for (const key of keys) {
        expect(activeKeys.includes(key)).toBe(true);
      }

      const extractedBatches = keyedAccumulator.extractAccumulatedBatches();
      expect(extractedBatches.size).toBe(keys.length);

      // After extraction, the accumulator should be reset with no retained items or keys.
      expect(keyedAccumulator.isEmpty).toBe(true);
      expect(keyedAccumulator.totalAccumulatedItemsCount).toBe(0);
      expect(keyedAccumulator.activeKeysCount).toBe(0);
      expect(keyedAccumulator.activeKeys).toEqual([]);

      for (const key of keys) {
        expect(keyedAccumulator.isActiveKey(key)).toBe(false);
        expect(keyedAccumulator.getAccumulatedItemsCount(key)).toBe(0);
      }

      for (const [key, batches] of extractedBatches) {
        validateBatches(batches, keyToEvents.get(key));
      }
    });

    test('should return an empty map when no items are accumulated', () => {
      const batchSize = 5;
      const accumulator = new KeyedBatchedAccumulator<IMockEvent>(batchSize);
      const numberOfExtractionAttempts = 15;

      let previousExtraction: Map<string, IMockEvent[][]>;
      for (let attempt = 0; attempt < numberOfExtractionAttempts; ++attempt) {
        const keyToBatches = accumulator.extractAccumulatedBatches();

        // Reference inequality is expected, even when both are empty.
        expect(keyToBatches).not.toBe(previousExtraction);
        expect(keyToBatches.size).toBe(0);

        previousExtraction = keyToBatches;
      }
    });
  });

  describe('Negative path tests', () => {
    test('should throw an error when batch size is a non-natural number', () => {
      const invalidBatchSizes = [
        -4.3,
        -2,
        0,
        0.001,
        543.9938,
        'natural number' as unknown as number,
        undefined as number,
        null as number,
        true as unknown as number,
      ];

      for (const batchSize of invalidBatchSizes) {
        expect(() => new KeyedBatchedAccumulator<string>(batchSize)).toThrow();
      }
    });

    test('should throw an error if key is not a non-empty string', () => {
      const batchSize = 16;
      const accumulator = new KeyedBatchedAccumulator<number>(batchSize);
      const invalidKeys = [
        -4.3 as unknown as string,
        0 as unknown as string,
        '',
        undefined as string,
        null as string,
        true as unknown as string,
        {} as string,
      ];

      for (const key of invalidKeys) {
        expect(() => accumulator.push(75, key)).toThrow();
      }
    });
  });
});
