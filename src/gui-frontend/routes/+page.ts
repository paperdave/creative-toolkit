import { status } from '$data';
import type { LoadEvent } from '@sveltejs/kit';

export async function load({ params: {} }: LoadEvent) {
  await Promise.all([
    //
    status.fetch(),
  ]);
}
