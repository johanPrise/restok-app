import { IsString, Length } from 'class-validator';

export class SearchRecipesDto {
  /** Ce qu'on veut manger : « poulet », « salade de thon ». */
  @IsString()
  @Length(2, 80)
  q: string;
}
