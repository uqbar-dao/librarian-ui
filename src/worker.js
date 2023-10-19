import { pipeline, AutoConfig } from "@xenova/transformers";

/**
 * This class uses the Singleton pattern to ensure that only one instance of the
 * pipeline is loaded. This is because loading the pipeline is an expensive
 * operation and we don't want to do it every time we want to translate a sentence.
 */
class MyTranslationPipeline {
  static task = "embeddings";
  static model = "Xenova/all-MiniLM-L6-v2";
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      const config = await AutoConfig.from_pretrained(this.model);
      this.instance = pipeline(this.task, this.model, { progress_callback, config, quantized: false });
    }

    return this.instance;
  }
}

// Listen for messages from the main thread
self.addEventListener("message", async (event) => {
  // Retrieve the translation pipeline. When called for the first time,
  // this will load the pipeline and save it for future use.
  let embedding = await MyTranslationPipeline.getInstance((x) => {
    // We also add a progress callback to the pipeline so that we can
    // track model loading.
    self.postMessage(x);
  });

  // Actually perform the translation
  let output = await embedding(event.data.text, {
    pooling: 'mean', 
    normalize: true,
    // Allows for partial output
    callback_function: (x) => {
      self.postMessage({
        status: "update",
        output: embedding.tokenizer.decode(x[0].output_token_ids, {
          skip_special_tokens: true,
        }),
      });
    },
  });

  // Send the output back to the main thread
  self.postMessage({
    status: "complete",
    output: output.data,
  });
});
