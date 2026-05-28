import { getApiErrorMessage } from "@/lib/api";
import { toast } from "@/lib/toast";

export async function runWithToast<T>(
  fn: () => Promise<T>,
  options: {
    successMessage: string;
    successTitle?: string;
    errorTitle?: string;
  },
): Promise<T | undefined> {
  try {
    const result = await fn();
    toast.success(options.successMessage, options.successTitle ?? "Done");
    return result;
  } catch (e) {
    toast.error(getApiErrorMessage(e), options.errorTitle ?? "Something went wrong");
    return undefined;
  }
}
