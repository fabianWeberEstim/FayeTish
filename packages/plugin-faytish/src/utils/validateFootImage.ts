import { ExtendedRuntime } from "../types/runtime";

export async function validateFootImage(
    imageUrl: string,
    runtime: ExtendedRuntime
): Promise<boolean> {
    try {
        const response = await runtime.llm.analyze({
            type: "image_analysis",
            prompt: `
            Analyze the provided image and determine:
            1. Is this a genuine photograph of a human foot?
            2. Does this image appear to be photoshopped or manipulated?
            3. Is this an original photo rather than one downloaded from the internet?

            Respond only with true or false. Return false if any of the above criteria are not met.
            `,
            image: imageUrl
        });

        return response.success;

    } catch (error) {
        console.error('Error validating foot image:', error);
        return false;
    }
}