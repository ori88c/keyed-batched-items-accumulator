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
/**
 * The `KeyedBatchedAccumulator` class accumulates items into fixed-size batches **per key**,
 * preserving insertion order within each key. It streams items directly into their respective
 * batches **at runtime, eliminating the overhead of post-processing flat arrays into chunks**.
 * By abstracting key-based batch management, it enables users to focus on application logic.
 *
 * ### Typical Use Cases
 * This utility is ideal for **delayed processing of key-partitioned data**, often used to
 * minimize network overhead. Common scenarios include:
 * - Batching Kafka messages by topic (using the topic name as key) and periodically publishing
 *   them in bulk. Popular Kafka clients operate at a lower level and do not offer built-in support
 *   for this pattern. As a result, developers often build high-level orchestration layers on top
 *   of these libraries to enable efficient batching.
 * - Ingesting events per tenant in multi-tenant systems
 * - Grouping and storing key-specific logs or metrics
 *
 * ### Example
 * Given a `KeyedBatchedAccumulator` instance with a batch size of 3, and the following input:
 * - `push({ ip: '192.0.2.1', type: 'scan' }, 'threat-events')`
 * - `push({ ip: '203.0.113.5', type: 'malware' }, 'threat-events')`
 * - `push({ userId: 'alice', action: 'login' }, 'auth-logs')`
 * - `push({ ip: '198.51.100.8', type: 'phishing' }, 'threat-events')`
 *
 * The resulting batches will be:
 * - For 'threat-events':
 *   - One full batch:
 *     [
 *       `{ ip: '192.0.2.1', type: 'scan' }`,
 *       `{ ip: '203.0.113.5', type: 'malware' }`,
 *       `{ ip: '198.51.100.8', type: 'phishing' }`
 *     ]
 * - For 'auth-logs':
 *   - One partial batch:
 *     [
 *       `{ userId: 'alice', action: 'login' }`
 *     ]
 *
 * ### Design Decision: No Peeking (`extractAccumulatedBatches`)
 * To maintain integrity, the class **does not provide direct access** to accumulated
 * items or batches. Exposing internal references could allow unintended modifications,
 * such as appending items to a full batch.
 * Instead, the `extractAccumulatedBatches` method **transfers ownership** of all batches
 * to the caller while resetting the instance to a clean state. This ensures the component's
 * guarantees remain intact and prevents accidental modifications of extracted batches.
 * However, while direct peeking is not possible, users can utilize the getter methods
 * `totalAccumulatedItemsCount`, `activeKeysCount`, and `isEmpty` to assess whether extraction
 * is needed.
 */
export declare class KeyedBatchedAccumulator<ItemType> {
    private readonly _batchSize;
    private readonly _keyToAccumulator;
    constructor(batchSize: number);
    /**
     * Returns the number of currently active keys.
     * A key is considered active if it has at least one accumulated item.
     * The time complexity of this operation is O(1).
     *
     * @returns The number of currently active keys.
     */
    get activeKeysCount(): number;
    /**
     * Returns an array of currently active keys.
     * A key is considered active if it has at least one accumulated item.
     * The time complexity of this operation is O(active-keys).
     *
     * @returns An array of currently active keys.
     */
    get activeKeys(): string[];
    /**
     * Returns the total number of accumulated items across all keys.
     * For example, if there are 3 keys, each with 2 full batches of 100 items,
     * the output will be 3 * 2 * 100 = 600.
     *
     * ### Use Case: Conditional Extraction
     * This method is useful for determining whether a minimum threshold of
     * accumulated items has been reached before extracting batches, helping
     * to avoid excessively small bulk operations.
     *
     * @returns The total number of accumulated items across all keys.
     */
    get totalAccumulatedItemsCount(): number;
    /**
     * Indicates whether this instance has accumulated any items.
     *
     * @returns `true` if no items have been accumulated, `false` otherwise.
     */
    get isEmpty(): boolean;
    /**
     * Returns the total number of accumulated items across all batches
     * for the specified key. For example, if the key currently has 5 full
     * batches and the batch size is 100, the output will be 500.
     *
     * ### Use Case: Conditional Extraction
     * This method is useful for determining whether a minimum threshold
     * of accumulated items has been reached for a given key before
     * extracting its batches, helping to avoid excessively small bulk operations.
     *
     * @param key The key whose accumulated item count is being queried.
     * @returns The total number of accumulated items for the specified key.
     */
    getAccumulatedItemsCount(key: string): number;
    /**
     * Indicates whether the specified key currently has at least one accumulated item.
     * The time complexity of this operation is O(1).
     *
     * ### Check-and-Abort Friendly
     * This method is particularly useful in "check and abort" scenarios, where an
     * operation should be skipped or aborted if the key does not have any accumulated items.
     *
     * @param key A non-empty string representing the key to check.
     * @returns `true` if the key has at least one accumulated item; `false` otherwise.
     */
    isActiveKey(key: string): boolean;
    /**
     * Adds an item to the accumulator associated with the given key, grouping it into a
     * fixed-size batch. If no batch exists for the key, or the latest batch is full, a
     * new batch is created.
     *
     * @param item The item to accumulate.
     * @param key A non-empty string representing the key under which to accumulate the item.
     */
    push(item: ItemType, key: string): void;
    /**
     * Extracts all accumulated batches per key and returns a map from each key to its
     * corresponding batches, represented as a 2D array. Each batch is a fixed-size
     * array of `ItemType` items. The final batch for a given key may be smaller if the
     * total item count is not a multiple of the batch size.
     *
     * Calling this method **transfers ownership** of the extracted batches to the caller.
     * After invocation, the accumulator is reset—its internal storage is cleared to begin
     * a new accumulation cycle. In particular:
     * - `isEmpty` returns `true`
     * - `activeKeysCount` returns `0`
     *
     * @returns A map where each active key is associated with a 2D array of extracted batches,
     *          each batch being a fixed-size array of `ItemType` items.
     */
    extractAccumulatedBatches(): Map<string, ItemType[][]>;
}
