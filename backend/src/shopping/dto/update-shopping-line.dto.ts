import { IsBoolean, IsInt, IsOptional, Min } from 'class-validator';

export class UpdateShoppingLineDto {
  /**
   * Cocher ou décocher. C'est le geste du magasin, et le seul qui parte en
   * rafale — d'où une route qui ne fait que ça.
   */
  @IsOptional()
  @IsBoolean()
  checked?: boolean;

  /**
   * Corriger ce qu'on prend vraiment. On était parti pour six rouleaux, le
   * paquet de douze était en promotion : sans ce champ, le stock rentre faux.
   */
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}
