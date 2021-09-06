/**
 * DO NOT EDIT THIS DIRECTLY!
 * Generated by @ople/codegen
 */
import { defineBackend, OpleProtocol, OpleCollection, OplePager, OpleRefLike, OpleRef } from "@ople/client"

interface Collections {
  users: OpleCollection<User>
  posts: OpleCollection<Post>
  replies: OpleCollection<Reply>
}

interface Functions {
  loadPosts(pagerOptions?: OplePager.Options): Promise<OplePager<Post>>
  loadReplies(parentRef: OpleRefLike<Reply> | OpleRefLike<Post>, pagerOptions?: OplePager.Options): Promise<OplePager<Reply>>
  publish(text: string): Promise<void>
  reply(to: OpleRefLike<Reply> | OpleRefLike<Post>, text: string): Promise<void>
  signUp(name: string, password: string): Promise<User>
  login(name: string, password: string): Promise<User>
  logout(): Promise<void>
  promote(ref: OpleRefLike<User>, secret: string): Promise<void>
  ban(ref: OpleRefLike<User>, banned?: boolean): Promise<void>
}

interface Signals {
  
}

declare const console: any

const backend = defineBackend<Collections, Functions, Signals>({
  onError: console.error,
  protocol: OpleProtocol.ws,
  url: "ws://localhost:3000/@ople-dev",
})

export default backend

const { functions, signals } = backend

export const loadPosts = functions.loadPosts
export const loadReplies = functions.loadReplies
export const publish = functions.publish
export const reply = functions.reply
export const signUp = functions.signUp
export const login = functions.login
export const logout = functions.logout
export const promote = functions.promote
export const ban = functions.ban



export interface User {
  name: string
  password: string
  banned?: boolean
  admin?: boolean
}

export interface Post {
  text: string
  author: OpleRef<User>
}

export interface Reply {
  text: string
  author: OpleRef<User>
  parent?: OpleRef<Reply>
  post: OpleRef<Post>
}