<h2 align="middle">keyed-batched-items-accumulator</h2>

The `KeyedBatchedAccumulator` class is a lightweight utility for Node.js projects that accumulates items into fixed-size batches (number-of-items wise) **per key**, preserving insertion order within each key. It **streams items directly into batches during runtime🌊**, avoiding the overhead of post-processing 1D arrays into chunks. This abstraction lets users focus on application logic without worrying about batch management.

Ideal for **delayed processing of key-partitioned data**, often used to minimize network overhead. Common scenarios include:
* Batching Kafka messages by topic (using the topic name as key) and periodically publishing them in bulk. Popular Kafka clients such as [@confluentinc/kafka-javascript](https://www.npmjs.com/package/@confluentinc/kafka-javascript) and [kafkajs](https://www.npmjs.com/package/kafkajs) operate at a lower level and do not offer built-in support for this pattern. As a result, developers often build high-level orchestration layers on top of these libraries to enable **efficient, high-throughput message publishing**. A corresponding code example is [included](#use-case-example) in this README.
* Ingesting events per tenant in multi-tenant systems.
* Grouping and storing key-specific logs or metrics.

## Table of Contents

* [Key Features](#key-features)
* [API](#api)
* [Getter Methods](#getter-methods)
* [Dry Run Example: Input/Output Behavior of Keyed Batching](#dry-run-example)
* [Use Case Example: Batched Kafka Publishing per Topic](#use-case-example)
* [Design Decision: No Peeking](#no-peeking)
* [License](#license)

## Key Features :sparkles:<a id="key-features"></a>

* __Designed for Efficient Bulk Data Preparation :package:__: Applications often aggregate data from user interactions before persisting it in bulk to storage systems or message queues such as Kafka, Amazon S3, MongoDB or MySQL. To reduce network overhead, items are temporarily buffered in memory and flushed in bulk periodically.
* __Key-Based Accumulation :card_file_box:__: Unlike the non-keyed package [batched-items-accumulator](https://www.npmjs.com/package/batched-items-accumulator), this variant is designed for scenarios where items must be **grouped and processed in batches per key**. For example, when accumulating MongoDB documents to later bulk-insert them into their respective collections, the keys can represent **collection names**. Each item is associated with a key, and the `extractAccumulatedBatches` method returns a `Map` from each key to its corresponding array of batches.
* __Fixed-Size Batches :straight_ruler:__: The `push` method appends each item to the latest batch associated with its key, provided the batch has not yet reached the size threshold. Otherwise, a new batch is created. Each batch contains the same number of items, except for the last batch, which may be partially filled.
* __Streaming-Friendly Accumulation :ocean:__: Items are accumulated into batches **during runtime**, eliminating the need for a **post-processing** step that chunks a 1D array - a common approach in other packages. Post-processing chunking adds **O(n) time and space** complexity, which can degrade performance when batch processing is frequent or batch sizes are large. In contrast, this package’s `extractAccumulatedBatches` method operates in **O(1) time and space**, as items are stored in batches from the start.
- __State Metrics :bar_chart:__: The `activeKeysCount`, `activeKeys`, `totalAccumulatedItemsCount` and `isEmpty` getters, along with the `getAccumulatedItemsCount` and `isActiveKey` methods, provide real-time insights into the accumulator's state. These can help to make informed decisions, such as whether a minimum threshold of accumulated items has been reached before extracting batches.
- __Comprehensive documentation :books:__: Fully documented, enabling IDEs to provide intelligent **tooltips** for an enhanced development experience.
- __Thoroughly Tested :test_tube:__: Backed by extensive unit tests, to ensure reliability in production.
- __Minimal External Dependencies :dove:__: Internally manages multiple instances of [batched-items-accumulator](https://www.npmjs.com/package/batched-items-accumulator), one per active key. This package focuses on efficient resource management while leveraging a well-tested foundation. Both packages are maintained by the same author :blue_heart:, and all other dependencies are dev-only.
- __ES2020 Compatibility__: The project targets ES2020 for modern JavaScript support.
- __Full TypeScript Support__: Designed for seamless TypeScript integration.

## API :globe_with_meridians:<a id="api"></a>

The `KeyedBatchedAccumulator` class provides the following methods:

* __push__: Adds an item to the accumulator associated with the given key, grouping it into a fixed-size batch. If no batch exists for the key, or the latest batch is full, a new batch is created.
* __extractAccumulatedBatches__: Extracts all accumulated batches per key and returns a map from each key to its corresponding batches, represented as a 2D array. Each batch is a fixed-size array of items. The final batch for a given key may be smaller if the total item count is not a multiple of the batch size. Calling this method **transfers ownership** of the extracted batches to the caller. After invocation, the accumulator is reset—its internal storage is cleared to begin a new accumulation cycle.
* __getAccumulatedItemsCount__: Returns the total number of accumulated items across all batches for the specified key.
* __isActiveKey__: Indicates whether the specified key currently has at least one accumulated item. This method is particularly useful in "check and abort" scenarios, where an operation should be skipped or aborted if the key does not have any accumulated items.

If needed, refer to the code documentation for a more comprehensive description of each method.

## Getter Methods :mag:<a id="getter-methods"></a>

The `KeyedBatchedAccumulator` class provides the following getter methods to reflect the current state:

* __activeKeysCount__: Returns the number of currently active keys. A key is considered active if it has at least one accumulated item.
* __activeKeys__: Returns an array of currently active keys.
* __totalAccumulatedItemsCount__: Returns the total number of accumulated items across all keys. This method is useful for determining whether a minimum threshold of accumulated items has been reached before extracting batches, helping to avoid excessively small bulk operations.
* __isEmpty__: Indicates whether this instance has accumulated any items.

### Dry Run Example: Input/Output Behavior of Keyed Batching :card_file_box:<a id="dry-run-example"></a>

Given a `KeyedBatchedAccumulator` instance with a batch size of 3, and the following input:
- `push({ ip: '192.0.2.1', type: 'scan' }, 'threat-events')`
- `push({ ip: '203.0.113.5', type: 'malware' }, 'threat-events')`
- `push({ userId: 'alice', action: 'login' }, 'auth-logs')`
- `push({ ip: '198.51.100.8', type: 'phishing' }, 'threat-events')`

The resulting batches will be:
- For 'threat-events':
  - One full batch:
    ```ts
    [
      { ip: '192.0.2.1', type: 'scan' },
      { ip: '203.0.113.5', type: 'malware' },
      { ip: '198.51.100.8', type: 'phishing' }
    ]
    ```
- For 'auth-logs':
  - One partial batch:
    ```ts
    [
      { userId: 'alice', action: 'login' }
    ]
    ```

## Use Case Example: Batched Kafka Publishing per Topic 🛰️<a id="use-case-example"></a>

Publishing each Kafka message individually can degrade performance due to increased bandwidth usage and overhead. To address this, it is a common practice to batch and publish messages periodically.

Popular Kafka clients like [@confluentinc/kafka-javascript](https://www.npmjs.com/package/@confluentinc/kafka-javascript) and [kafkajs](https://www.npmjs.com/package/kafkajs) operate at a lower level and do not offer built-in support for this pattern. As a result, developers often build custom orchestration layers on top of these libraries to enable **efficient, high-throughput message publishing**.

The `KeyedBatchedAccumulator` class helps facilitate this pattern by accumulating messages per topic, using topic names as keys. The appropriate batch size should account for the Kafka client's configured thresholds (e.g., maximum request size, message size, etc.). A good rule of thumb is:
```ts
const GRACE_FACTOR = 0.7;
const estimatedMaxMessagesPerBatch = Math.floor(
  GRACE_FACTOR * MAX_BATCH_BYTES / MAX_MESSAGE_BYTES
);
```
The grace factor accounts for metadata overhead and ensures that batch size remains within limits.

This example leverages the [non-overlapping-recurring-task](https://www.npmjs.com/package/non-overlapping-recurring-task) package to periodically publish accumulated messages without overlapping executions - keeping bandwidth usage **predictable and stable**:
```ts
import { KeyedBatchedAccumulator } from 'keyed-batched-items-accumulator';
import {
  NonOverlappingRecurringTask,
  INonOverlappingRecurringTaskOptions
} from 'non-overlapping-recurring-task';
import { Producer, Message } from '@confluentinc/kafka-javascript';

const FLUSH_INTERVAL_MS = 3000;

class KafkaBatchPublisher {
  private readonly _producer: Producer;
  private readonly _accumulator: KeyedBatchedAccumulator<Message>;
  private readonly _publishTask: NonOverlappingRecurringTask;

  constructor(
    producer: Producer,
    numberOfMessagesInBatch: number
  ) {
    this._producer = producer;
    this._accumulator = new KeyedBatchedAccumulator<Message>(
      messagesPerBatch
    );

    const recurringPublishOptions: INonOverlappingRecurringTaskOptions = {
      intervalMs: FLUSH_INTERVAL_MS,
      immediateFirstRun: false
    };
    this._publishTask = new NonOverlappingRecurringTask<MongoError>(
      this._publishBatchesSequentially.bind(this),
      recurringPublishOptions,
      this._handlePublishError.bind(this)
    );
  }

  public async start(): Promise<void> {
    await this._publishTask.start();
  }
  
  public async stop(): Promise<void> {
    const shouldExecuteFinalRun = true;
    await this._publishTask.stop(shouldExecuteFinalRun);
  }

  public enqueue(message: Message, topic: string): void {
    this._accumulator.push(message, topic);
  }

  private async _publishBatchesSequentially(): Promise<void> {
    const batchesByTopic: Map<string, Message[][]> =
      this._accumulator.extractAccumulatedBatches();

    for (const [topic, batches] of batchesByTopic) {
      for (const batch of batches) {
        await this._producer.sendBatch({
          topicMessages: [{ topic, messages: batch }]
        });
      }
    }
  }

  private _handlePublishError(error: Error): void {
    // Implement custom error handling logic here.
  }
}
```

## Design Decision: No Peeking :see_no_evil:<a id="no-peeking"></a>

To maintain integrity, the class **does not provide direct access** to accumulated items or batches. Exposing internal references could allow unintended modifications, such as appending items to a full batch. Instead, the `extractAccumulatedBatches` method **transfers ownership** of all batches to the caller while resetting the instance to a clean state. This ensures the component's guarantees remain intact and prevents accidental modifications of extracted batches.

However, while direct peeking is not possible, users can leverage state-inspection methods such as `activeKeysCount`, `activeKeys`, `isActiveKey`, `totalAccumulatedItemsCount`, `getAccumulatedItemsCount` and `isEmpty` to assess whether extraction is needed.

## License :scroll:<a id="license"></a>

[Apache 2.0](LICENSE)
