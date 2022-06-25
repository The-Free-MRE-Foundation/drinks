/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Actor, AssetContainer, AttachPoint, ColliderType, CollisionLayer, Color3, Color4, Context, ScaledTransformLike, User } from "@microsoft/mixed-reality-extension-sdk";
import { translate } from "./utils";

export interface DrinkOptions {
        user: User,
        attachPoint?: AttachPoint,
        transform: Partial<ScaledTransformLike>,
        levels: {
                resourceId: string,
                sound?: string,
        }[],
        trigger: {
                transform: Partial<ScaledTransformLike>,
                dimensions: {
                        width: number,
                        height: number,
                        depth: number
                }
        }
}

const MIN_DRINK_INTERVAL = 1000;

export class Drink {
        private anchor: Actor;
        private models: Actor[] = [];
        private trigger: Actor;
        private lastSip: number = 0;

        private _level: number = 0;
        get level() {
                return this._level;
        }
        set level(l: number) {
                l = Math.max(0, Math.min(l, this.options.levels.length - 1));
                if (this._level == l) return;
                const now = Date.now();
                if (now - this.lastSip <= MIN_DRINK_INTERVAL){ return; }

                this.models[this._level].appearance.enabled = false;
                this._level = l;
                this.models[this._level].appearance.enabled = true;
                this.lastSip = now;
        }

        constructor(private context: Context, private assets: AssetContainer, private options: DrinkOptions) {
                this.init();
        }

        private init() {
                this.anchor = Actor.Create(this.context, {
                        actor: {
                                attachment: {
                                        userId: this.options.user.id,
                                        attachPoint: this.options.attachPoint ? this.options.attachPoint : 'right-hand',
                                }
                        }
                });
                this.createModels();
                this.createTrigger();
        }

        private createModels() {
                const local = translate(this.options.transform).toJSON();
                this.models = this.options.levels.map((o, i) => {
                        const model = Actor.CreateFromLibrary(this.context, {
                                resourceId: o.resourceId,
                                actor: {
                                        parentId: this.anchor.id,
                                        appearance: {
                                                enabled: i == this.level ? true : false,
                                        },
                                        transform: {
                                                local
                                        },
                                }
                        });
                        return model;
                });
        }

        private createTrigger() {
                const local = translate(this.options.trigger.transform).toJSON();
                const dim = this.options.trigger.dimensions;
                const name = `${dim.width},${dim.height},${dim.depth}`;
                let mesh = this.assets.meshes.find(m => m.name === name);
                if (!mesh) {
                        mesh = this.assets.createBoxMesh(name, dim.width, dim.height, dim.depth);
                }

                const material = this.assets.materials.find(m => m.name === 'invisible');

                this.trigger = Actor.Create(this.context, {
                        actor: {
                                parentId: this.anchor.id,
                                transform: {
                                        local,
                                },
                                appearance: {
                                        meshId: mesh.id,
                                        materialId: material.id,
                                },
                                collider: {
                                        geometry: { shape: ColliderType.Box },
                                        layer: CollisionLayer.Hologram,
                                        isTrigger: true,
                                },
                                rigidBody: {
                                        enabled: true,
                                        isKinematic: true,
                                        useGravity: false
                                },
                        }
                });

                this.trigger.collider.onTrigger('trigger-enter', (actor: Actor) => {
                        if (actor.name == 'mouth') {
                                this.level++;
                        }
                });
        }

        public remove() {
                this.models.forEach(a => a.destroy());
                this.trigger.destroy();
                this.anchor.destroy();
        }

        public reattach(){
                const attachPoint = this.options.attachPoint ? this.options.attachPoint : 'right-hand';
                const userId = this.options.user;
                this.anchor.detach();
                this.anchor.attach(userId, attachPoint);
        }
}
