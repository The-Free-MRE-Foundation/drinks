/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Actor, AlphaMode, AssetContainer, AttachPoint, ColliderType, CollisionLayer, Color3, Color4, Context, ScaledTransformLike, User } from "@microsoft/mixed-reality-extension-sdk";
import { translate } from "./utils";

export const DRINK_COMMONS = {
        trigger: {
                transform: {},
                dimensions: {
                        width: 0,
                        height: 0,
                        depth: 0
                }
        }
}

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

export class Drink {
        private anchor: Actor;
        private models: Actor[] = [];
        private trigger: Actor;

        private _level: number = 0;
        get level() {
                return this._level;
        }
        set level(l: number) {
                l = Math.max(0, Math.min(l, this.options.levels.length - 1));
                if (this._level == l) return;
                this.models[this._level].appearance.enabled = false;
                this._level = l;
                this.models[this._level].appearance.enabled = true;
        }

        constructor(private context: Context, private assets: AssetContainer, private options: DrinkOptions) {
                this.init();
        }

        private init() {
                this.anchor = Actor.Create(this.context);
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
                                        attachment: {
                                                userId: this.options.user.id,
                                                attachPoint: this.options.attachPoint ? this.options.attachPoint : 'right-hand',
                                        }
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

                let material = this.assets.materials.find(m => m.name === 'invisible');
                if (!material) {
                        material = this.assets.createMaterial('invisible', { color: Color4.FromColor3(Color3.Red(), 0.0), alphaMode: AlphaMode.Blend });
                }

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
                                this.level--;
                        }
                });
        }

        public remove() {
                this.models.forEach(a=>a.destroy());
                this.trigger.destroy();
                this.anchor.destroy();
        }
}
