import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { stopResearch } from "@/hooks/useRunStream";
import { useUiStore } from "@/store/uiStore";

export function ConfirmStopDialog() {
  const open = useUiStore((s) => s.stopDialogOpen);
  const setOpen = useUiStore((s) => s.setStopDialogOpen);
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Stop this run? Progress will be lost.</AlertDialogTitle>
          <AlertDialogDescription>
            The agent finishes the step it is on, then stops. Drafts from this run are not saved to the library.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep running</AlertDialogCancel>
          <AlertDialogAction destructive onClick={() => void stopResearch()}>
            Stop run
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
