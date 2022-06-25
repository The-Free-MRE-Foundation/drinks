/*!
 * Copyright (c) The Free MRE Foundation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Actor, AlphaMode, AssetContainer, AttachPoint, ColliderType, CollisionLayer, Color3, Color4, Context, ScaledTransformLike, User } from "@microsoft/mixed-reality-extension-sdk";
import { Drink, DrinkOptions } from "./drink";
import { translate } from "./utils";

export interface PlayerOptions {
        user: User,
        mouth: {
                attachPoint?: AttachPoint,
                transform: Partial<ScaledTransformLike>,
                dimensions: {
                        width: number,
                        height: number,
                        depth: number
                }
        },
}

export class Player {
        private mouth: Actor;
        private drink: Drink;

        constructor(private context: Context, private assets: AssetContainer, private options: PlayerOptions) {
                this.init();
        }

        private init() {
                this.createMouth();
        }

        private createMouth() {
                if (this.mouth) { return; }
                const local = translate(this.options.mouth.transform).toJSON();
                const dim = this.options.mouth.dimensions;
                const name = `${dim.width},${dim.height},${dim.depth}`;
                let mesh = this.assets.meshes.find(m => m.name === name);
                if (!mesh) {
                        mesh = this.assets.createBoxMesh(name, dim.width, dim.height, dim.depth);
                }

                let material = this.assets.materials.find(m => m.name === 'invisible');
                if (!material) {
                        material = this.assets.createMaterial('invisible', { color: Color4.FromColor3(Color3.Red(), 0.0), alphaMode: AlphaMode.Blend });
                }

                this.mouth = Actor.Create(this.context, {
                        actor: {
                                name: 'mouth',
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
                                },
                                attachment: {
                                        userId: this.options.user.id,
                                        attachPoint: this.options.mouth.attachPoint ? this.options.mouth.attachPoint : 'head'
                                }
                        }
                });
        }

        public equipDrink(options: DrinkOptions) {
                this.drink?.remove();
                this.drink = new Drink(this.context, this.assets, options);
        }

        public removeDrink() {
                this.drink?.remove();
                this.drink == undefined;
        }

        public remove() {
                this.mouth.destroy();
                this.drink?.remove();
        }
}
