import { auth } from "@/modules/auth/server";
export async function GET(request: Request) {
  return auth().handler(request);
}
export async function POST(request: Request) {
  return auth().handler(request);
}
